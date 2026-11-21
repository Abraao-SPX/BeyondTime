package br.com.beyondtime.profile.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProfileAvatarIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldUploadConvertToWebPAndServeProfileAvatarEndToEnd() throws Exception {
        String email = "avatar-" + UUID.randomUUID().toString().substring(0, 8) + "@beyondtime.com.br";
        String registerBody = """
                {
                  "email": "%s",
                  "password": "SenhaForte@2026!",
                  "birthDate": "1968-05-15"
                }
                """.formatted(email);

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode authJson = objectMapper.readTree(registerResult.getResponse().getContentAsString());
        String accessToken = authJson.get("accessToken").asText();

        String profileBody = """
                {
                  "fullName": "Maria Clara Santos",
                  "city": "Aracaju (SE)",
                  "hobbies": ["Jardinagem e Plantas", "Cinema e Teatro", "Café da Tarde e Boa Conversa"],
                  "goal": "Amizade"
                }
                """;

        mockMvc.perform(put("/api/v1/profiles/me")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Maria Clara Santos"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());

        // Upload válido JPEG -> convertido em WebP 400x400
        byte[] jpegBytes = createSampleJpeg(700, 500);
        MockMultipartFile avatarFile = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", jpegBytes);

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/profiles/me/avatar")
                        .file(avatarFile)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar").isString())
                .andExpect(jsonPath("$.avatarUrl").isString())
                .andReturn();

        JsonNode uploadJson = objectMapper.readTree(uploadResult.getResponse().getContentAsString());
        String avatarFilename = uploadJson.get("avatar").asText();
        String avatarUrl = uploadJson.get("avatarUrl").asText();

        assertThat(avatarFilename).endsWith(".webp");
        assertThat(avatarUrl).isEqualTo("/api/v1/profiles/avatars/" + avatarFilename);

        // GET /profiles/me agora inclui avatarUrl
        mockMvc.perform(get("/api/v1/profiles/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(avatarUrl));

        // GET do avatar serve image/webp com assinatura RIFF....WEBP
        byte[] servedBytes = mockMvc.perform(get(avatarUrl))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/webp"))
                .andReturn()
                .getResponse()
                .getContentAsByteArray();

        assertThat(new String(servedBytes, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("RIFF");
        assertThat(new String(servedBytes, 8, 4, StandardCharsets.US_ASCII)).isEqualTo("WEBP");

        // Upload falso (texto renomeado para .jpg) deve retornar 400
        MockMultipartFile fakeFile = new MockMultipartFile(
                "file",
                "malicioso.jpg",
                "image/jpeg",
                "nao-e-uma-imagem".getBytes(StandardCharsets.UTF_8)
        );
        mockMvc.perform(multipart("/api/v1/profiles/me/avatar")
                        .file(fakeFile)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isBadRequest());
    }

    private byte[] createSampleJpeg(int width, int height) throws Exception {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(33, 77, 64));
        g.fillRect(0, 0, width, height);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", baos);
        return baos.toByteArray();
    }
}
