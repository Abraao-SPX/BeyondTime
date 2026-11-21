package br.com.beyondtime.profile.service;

import br.com.beyondtime.shared.exception.BusinessException;
import net.coobird.thumbnailator.Thumbnails;
import net.coobird.thumbnailator.geometry.Positions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AvatarService {

    private static final Logger log = LoggerFactory.getLogger(AvatarService.class);
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final int MAX_IMAGE_DIMENSION = 8000;
    private static final int AVATAR_SIZE_PX = 400;
    private static final double WEBP_QUALITY = 0.80;
    private static final Pattern SAFE_AVATAR_FILENAME = Pattern.compile("^[a-f0-9-]{36}\\.webp$");

    private final Path diretorioUploads;

    public AvatarService(
            @Value("${beyondtime.uploads.avatars-dir:uploads/avatars}") String avatarsDir) {
        this.diretorioUploads = Paths.get(avatarsDir).toAbsolutePath().normalize();
    }

    public String salvarAvatar(MultipartFile file, String avatarAntigo) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(
                    "EMPTY_AVATAR_FILE",
                    "Selecione uma imagem válida antes de enviar.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException(
                    "AVATAR_TOO_LARGE",
                    "A foto enviada excede o limite máximo de 5 MB.",
                    HttpStatus.PAYLOAD_TOO_LARGE
            );
        }

        byte[] rawBytes;
        try {
            rawBytes = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(
                    "AVATAR_READ_ERROR",
                    "Não foi possível ler o arquivo de imagem enviado.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (rawBytes.length == 0 || rawBytes.length > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException(
                    "AVATAR_INVALID_SIZE",
                    "A foto enviada é inválida ou excede o limite máximo de 5 MB.",
                    HttpStatus.BAD_REQUEST
            );
        }

        BufferedImage imagemOriginal = validateAndDecodeImage(rawBytes);

        byte[] webpBytes;
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            Thumbnails.of(imagemOriginal)
                    .crop(Positions.CENTER)
                    .size(AVATAR_SIZE_PX, AVATAR_SIZE_PX)
                    .outputFormat("webp")
                    .outputQuality(WEBP_QUALITY)
                    .toOutputStream(outputStream);
            webpBytes = outputStream.toByteArray();
        } catch (IOException e) {
            log.error("[BeyondTime Avatar] Falha ao converter imagem para WebP: {}", e.getMessage());
            throw new BusinessException(
                    "AVATAR_PROCESSING_ERROR",
                    "Não foi possível processar e padronizar a imagem enviada.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        if (webpBytes.length == 0) {
            throw new BusinessException(
                    "AVATAR_PROCESSING_ERROR",
                    "Não foi possível gerar a imagem otimizada em WebP.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        String novoNome = UUID.randomUUID() + ".webp";
        try {
            Files.createDirectories(diretorioUploads);
            Path destino = resolveSafePath(novoNome);
            Files.write(destino, webpBytes);
        } catch (IOException e) {
            log.error("[BeyondTime Avatar] Falha ao gravar arquivo de avatar em disco: {}", e.getMessage());
            throw new BusinessException(
                    "AVATAR_STORAGE_ERROR",
                    "Não foi possível salvar sua foto de perfil no servidor.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        if (avatarAntigo != null && !avatarAntigo.isBlank() && !avatarAntigo.equals(novoNome)) {
            deleteAvatarQuietly(avatarAntigo);
        }

        return novoNome;
    }

    public byte[] loadAvatarBytes(String filename) {
        if (!isSafeAvatarFilename(filename)) {
            throw new BusinessException(
                    "INVALID_AVATAR_FILENAME",
                    "Foto de perfil não encontrada.",
                    HttpStatus.NOT_FOUND
            );
        }

        Path path = resolveSafePath(filename);
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            throw new BusinessException(
                    "AVATAR_NOT_FOUND",
                    "Foto de perfil não encontrada.",
                    HttpStatus.NOT_FOUND
            );
        }

        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            log.error("[BeyondTime Avatar] Erro ao ler avatar {}: {}", filename, e.getMessage());
            throw new BusinessException(
                    "AVATAR_READ_ERROR",
                    "Não foi possível carregar a foto de perfil.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    public void deleteAvatarQuietly(String filename) {
        if (!isSafeAvatarFilename(filename)) {
            return;
        }
        try {
            Path target = resolveSafePath(filename);
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("[BeyondTime Avatar] Não foi possível remover avatar antigo {}: {}", filename, e.getMessage());
        }
    }

    public String buildAvatarUrl(String filename) {
        if (!isSafeAvatarFilename(filename)) {
            return null;
        }
        return "/api/v1/profiles/avatars/" + filename;
    }

    private BufferedImage validateAndDecodeImage(byte[] rawBytes) {
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(rawBytes))) {
            if (iis == null) {
                throw invalidImageException();
            }

            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw invalidImageException();
            }

            ImageReader reader = readers.next();
            try {
                reader.setInput(iis, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                    throw new BusinessException(
                            "INVALID_AVATAR_DIMENSIONS",
                            "As dimensões da imagem são inválidas ou excedem o limite permitido.",
                            HttpStatus.BAD_REQUEST
                    );
                }
                BufferedImage image = reader.read(0);
                if (image == null) {
                    throw invalidImageException();
                }
                return image;
            } finally {
                reader.dispose();
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw invalidImageException();
        }
    }

    private BusinessException invalidImageException() {
        return new BusinessException(
                "INVALID_AVATAR_IMAGE",
                "O arquivo enviado não é uma imagem válida (use JPEG, PNG ou WebP).",
                HttpStatus.BAD_REQUEST
        );
    }

    private boolean isSafeAvatarFilename(String filename) {
        return filename != null && SAFE_AVATAR_FILENAME.matcher(filename).matches();
    }

    private Path resolveSafePath(String filename) {
        Path resolved = diretorioUploads.resolve(filename).normalize();
        if (!resolved.startsWith(diretorioUploads)) {
            throw new BusinessException(
                    "INVALID_AVATAR_FILENAME",
                    "Nome de arquivo inválido.",
                    HttpStatus.BAD_REQUEST
            );
        }
        return resolved;
    }
}
