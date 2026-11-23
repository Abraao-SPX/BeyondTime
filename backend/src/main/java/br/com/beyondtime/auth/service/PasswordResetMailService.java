package br.com.beyondtime.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetMailService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String smtpUsername;

    public PasswordResetMailService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${beyondtime.mail.from:nao-responda@beyondtime.com.br}") String fromAddress,
            @Value("${spring.mail.username:}") String smtpUsername) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.smtpUsername = smtpUsername != null ? smtpUsername.trim() : "";
    }

    public void sendResetCode(String recipientEmail, String resetCode, long expirationMinutes) {
        String safeRecipient = sanitizeHeaderValue(recipientEmail);
        String maskedEmail = maskEmail(safeRecipient);

        if (mailSender == null || smtpUsername.isEmpty()) {
            log.info("[BeyondTime Mail] SMTP não configurado (SPRING_MAIL_USERNAME vazio). " +
                    "Configure o SMTP no .env para envio real de e-mail para {}.", maskedEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sanitizeHeaderValue(fromAddress));
            message.setTo(safeRecipient);
            message.setSubject("BeyondTime - Seu código de recuperação de senha");
            message.setText(
                    "Olá!\n\n" +
                    "Recebemos um pedido para recuperar sua senha no BeyondTime.\n\n" +
                    "Seu código de segurança de 6 caracteres é:\n\n" +
                    "    " + resetCode + "\n\n" +
                    "Este código vale por " + expirationMinutes + " minutos.\n" +
                    "Se você não pediu essa troca, basta ignorar este e-mail — sua conta continua protegida.\n\n" +
                    "Equipe BeyondTime (Comunidade 50+)"
            );
            mailSender.send(message);
            log.info("[BeyondTime Mail] Código de recuperação enviado por e-mail para {}.", maskedEmail);
        } catch (Exception ex) {
            log.error("[BeyondTime Mail] Falha ao enviar e-mail SMTP para {}: {}", maskedEmail, ex.getMessage());
        }
    }

    private String sanitizeHeaderValue(String value) {
        if (value == null) return "";
        return value.replaceAll("[\\r\\n]", "").trim();
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) return "***";
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "***" + (atIndex >= 0 ? email.substring(atIndex) : "");
        }
        return email.charAt(0) + "***" + email.substring(atIndex);
    }
}
