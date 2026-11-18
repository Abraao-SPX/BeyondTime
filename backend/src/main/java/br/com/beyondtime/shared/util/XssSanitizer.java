package br.com.beyondtime.shared.util;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Utilitário centralizado de sanitização e validação contra XSS (Cross-Site Scripting),
 * injeção de scripts (<script>, javascript:, event handlers on*=) e caracteres de controle
 * antes da persistência no banco de dados PostgreSQL.
 */
public final class XssSanitizer {

    private static final Pattern SCRIPT_BLOCK_PATTERN = Pattern.compile(
            "(?is)<\\s*(script|iframe|object|embed|svg|math|style|link|meta|base|form)\\b[^>]*>.*?<\\s*/\\s*\\1\\s*>"
    );

    private static final Pattern SELF_CLOSING_DANGEROUS_TAG_PATTERN = Pattern.compile(
            "(?is)<\\s*/?\\s*(script|iframe|object|embed|svg|math|style|link|meta|base|form|img|input|body|html)\\b[^>]*>"
    );

    private static final Pattern ANY_HTML_TAG_PATTERN = Pattern.compile("(?is)<[^>]*>");

    private static final Pattern DANGEROUS_PAYLOAD_PATTERN = Pattern.compile(
            "(?is)(<\\s*/?\\s*(script|iframe|object|embed|svg|math|style|link|meta)\\b|" +
            "javascript\\s*:|vbscript\\s*:|data\\s*:\\s*text/html|" +
            "\\bon(load|error|click|mouseover|focus|blur|submit|change|input|keydown|keyup)\\s*=|" +
            "expression\\s*\\(|eval\\s*\\()"
    );

    private static final Pattern INLINE_JS_SCHEME_PATTERN = Pattern.compile(
            "(?is)(javascript\\s*:|vbscript\\s*:|data\\s*:\\s*text/html)"
    );

    private static final Pattern INLINE_EVENT_HANDLER_PATTERN = Pattern.compile(
            "(?is)\\bon[a-z]{3,20}\\s*="
    );

    private XssSanitizer() {
    }

    /**
     * Verifica se o texto contém tentativa explícita de injeção de script ou XSS.
     */
    public static boolean containsMaliciousScript(String input) {
        if (input == null || input.isBlank()) {
            return false;
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKC)
                .replace("\0", "");
        return DANGEROUS_PAYLOAD_PATTERN.matcher(normalized).find();
    }

    /**
     * Sanitiza um texto simples (ex.: nome, cidade, objetivo), removendo blocos <script> inteiros,
     * tags HTML, esquemas javascript:, atributos on*= e caracteres de controle.
     */
    public static String sanitizeSingleLine(String input) {
        if (input == null) {
            return "";
        }
        String clean = Normalizer.normalize(input, Normalizer.Form.NFKC);
        clean = SCRIPT_BLOCK_PATTERN.matcher(clean).replaceAll("");
        clean = SELF_CLOSING_DANGEROUS_TAG_PATTERN.matcher(clean).replaceAll("");
        clean = ANY_HTML_TAG_PATTERN.matcher(clean).replaceAll("");
        clean = INLINE_JS_SCHEME_PATTERN.matcher(clean).replaceAll("");
        clean = INLINE_EVENT_HANDLER_PATTERN.matcher(clean).replaceAll("");
        clean = clean.replaceAll("[<>\"'`]", "");
        clean = clean.replaceAll("[\\p{Cntrl}]", "");
        return clean.trim().replaceAll("\\s{2,}", " ");
    }

    /**
     * Sanitiza um texto multilinha (ex.: bio do perfil), removendo blocos <script>...</script>
     * (inclusive o código interno do script), qualquer tag HTML e payloads XSS antes de salvar no banco.
     */
    public static String sanitizeMultiLine(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String clean = Normalizer.normalize(input, Normalizer.Form.NFKC);
        clean = SCRIPT_BLOCK_PATTERN.matcher(clean).replaceAll("");
        clean = SELF_CLOSING_DANGEROUS_TAG_PATTERN.matcher(clean).replaceAll("");
        clean = ANY_HTML_TAG_PATTERN.matcher(clean).replaceAll("");
        clean = INLINE_JS_SCHEME_PATTERN.matcher(clean).replaceAll("");
        clean = INLINE_EVENT_HANDLER_PATTERN.matcher(clean).replaceAll("");
        clean = clean.replaceAll("[<>]", "");
        clean = clean.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "");
        clean = clean.trim();
        return clean.isEmpty() ? null : clean;
    }
}
