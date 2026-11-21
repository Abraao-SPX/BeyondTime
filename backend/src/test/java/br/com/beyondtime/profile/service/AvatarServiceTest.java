package br.com.beyondtime.profile.service;

import br.com.beyondtime.shared.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AvatarServiceTest {

    @TempDir
    Path tempDir;

    private AvatarService avatarService;

    @BeforeEach
    void setUp() {
        avatarService = new AvatarService(tempDir.toString());
    }

    @Test
    void shouldCropResizeTo400x400AndConvertToWebPAndDeleteOldAvatar() throws Exception {
        byte[] jpegBytes = createSampleImageBytes(800, 500, "jpg");
        MockMultipartFile file = new MockMultipartFile("file", "foto.jpg", "image/jpeg", jpegBytes);

        String savedName1 = avatarService.salvarAvatar(file, null);

        assertThat(savedName1).matches("^[a-f0-9-]{36}\\.webp$");
        Path file1 = tempDir.resolve(savedName1);
        assertThat(Files.exists(file1)).isTrue();

        byte[] webpBytes = avatarService.loadAvatarBytes(savedName1);
        // Assinatura mágica RIFF....WEBP
        assertThat(webpBytes.length).isGreaterThan(12);
        assertThat(new String(webpBytes, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("RIFF");
        assertThat(new String(webpBytes, 8, 4, StandardCharsets.US_ASCII)).isEqualTo("WEBP");

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(webpBytes));
        assertThat(decoded).isNotNull();
        assertThat(decoded.getWidth()).isEqualTo(400);
        assertThat(decoded.getHeight()).isEqualTo(400);

        // Envia novo avatar e verifica remoção segura do anterior
        byte[] pngBytes = createSampleImageBytes(600, 600, "png");
        MockMultipartFile file2 = new MockMultipartFile("file", "foto2.png", "image/png", pngBytes);
        String savedName2 = avatarService.salvarAvatar(file2, savedName1);

        assertThat(savedName2).isNotEqualTo(savedName1);
        assertThat(Files.exists(tempDir.resolve(savedName2))).isTrue();
        assertThat(Files.exists(file1)).isFalse();
    }

    @Test
    void shouldRejectFakeImageRenamedAsJpeg() {
        byte[] fakePayload = "<script>alert('xss')</script>".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile maliciousFile = new MockMultipartFile("file", "fake.jpg", "image/jpeg", fakePayload);

        assertThatThrownBy(() -> avatarService.salvarAvatar(maliciousFile, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("imagem válida");
    }

    @Test
    void shouldBlockPathTraversalWhenLoadingOrDeletingAvatar() {
        assertThatThrownBy(() -> avatarService.loadAvatarBytes("../../etc/passwd"))
                .isInstanceOf(BusinessException.class);
        avatarService.deleteAvatarQuietly("../outside.webp");
    }

    private byte[] createSampleImageBytes(int width, int height, String format) throws Exception {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(180, 78, 53));
        g.fillRect(0, 0, width, height);
        g.setColor(Color.WHITE);
        g.fillOval(width / 4, height / 4, Math.min(width, height) / 2, Math.min(width, height) / 2);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, format, baos);
        return baos.toByteArray();
    }
}
