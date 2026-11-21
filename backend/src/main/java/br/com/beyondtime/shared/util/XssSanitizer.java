package br.com.beyondtime.shared.util;

import java.text.Normalizer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utilitário centralizado de sanitização e validação contra XSS (Cross-Site Scripting),
 * injeção de scripts (<script>, javascript:, event handlers on*=), bypass por tags aninhadas,
 * entidades HTML codificadas e caracteres de controle antes da persistência no PostgreSQL.
 */
public final class XssSanitizer {

    private static final int MAX_PASSES = 5;
    private static final int MAX_ANALYSIS_LENGTH = 16_384;

    private static final Pattern SCRIPT_BLOCK_PATTERN = Pattern.compile(
            "(?is)<\\s*(script|style|iframe|svg|object|embed|math|link|meta|base|form)\\b[^<>]{0,512}>[\\s\\S]{0,10000}?<\\s*/\\s*\\1\\s*>"
    );

    private static final Pattern SELF_CLOSING_DANGEROUS_TAG_PATTERN = Pattern.compile(
            "(?is)<\\s*/?\\s*(script|style|iframe|svg|object|embed|math|link|meta|base|form|img|input|body|html)\\b[^<>]{0,512}>"
    );

    private static final Pattern ANY_HTML_TAG_PATTERN = Pattern.compile("(?is)<[^<>]{0,1024}>");

    private static final Pattern DANGEROUS_PAYLOAD_PATTERN = Pattern.compile(
            "(?is)(<\\s*/?\\s*[a-z!]|" +
            "javascript\\s*:|vbscript\\s*:|data\\s*:\\s*text/html|" +
            "\\bon[a-z]{2,30}\\s*=|" +
            "expression\\s*\\(|eval\\s*\\()"
    );

    private static final Pattern INLINE_JS_SCHEME_PATTERN = Pattern.compile(
            "(?is)(javascript\\s*:|vbscript\\s*:|data\\s*:\\s*text/html)"
    );

    private static final Pattern INLINE_EVENT_HANDLER_PATTERN = Pattern.compile(
            "(?is)\\bon[a-z]{2,30}\\s*="
    );

    private static final Pattern DANGEROUS_CALL_PATTERN = Pattern.compile(
            "(?is)(expression|eval)\\s*\\("
    );

    private static final Pattern DOUBLE_ENCODED_AMP_PATTERN = Pattern.compile(
            "(?i)&amp;(?=(?:lt|gt|quot|apos|colon|#))"
    );

    private static final Pattern HEX_ENTITY_PATTERN = Pattern.compile("(?i)&#x0*([0-9a-f]{1,6});?");
    private static final Pattern DEC_ENTITY_PATTERN = Pattern.compile("&#0*([0-9]{1,7});?");
    private static final Pattern LT_ENTITY_PATTERN = Pattern.compile("(?i)&lt(?:;|(?![a-z0-9]))");
    private static final Pattern GT_ENTITY_PATTERN = Pattern.compile("(?i)&gt(?:;|(?![a-z0-9]))");
    private static final Pattern QUOT_ENTITY_PATTERN = Pattern.compile("(?i)&quot;");
    private static final Pattern APOS_ENTITY_PATTERN = Pattern.compile("(?i)&apos;");
    private static final Pattern COLON_ENTITY_PATTERN = Pattern.compile("(?i)&colon;");

    private XssSanitizer() {
    }

    /**
     * Verifica se o texto contém tentativa explícita de injeção de script ou XSS,
     * incluindo entidades HTML numéricas/nomeadas codificadas.
     */
    public static boolean containsMaliciousScript(String input) {
        if (input == null || input.isBlank()) {
            return false;
        }
        String bounded = input.length() > MAX_ANALYSIS_LENGTH
                ? input.substring(0, MAX_ANALYSIS_LENGTH)
                : input;
        String normalized = Normalizer.normalize(bounded, Normalizer.Form.NFKC)
                .replace("\0", "");
        for (int i = 0; i < MAX_PASSES; i++) {
            if (DANGEROUS_PAYLOAD_PATTERN.matcher(normalized).find()) {
                return true;
            }
            String decoded = decodeDangerousHtmlEntities(normalized);
            if (decoded.equals(normalized)) {
                break;
            }
            normalized = decoded;
        }
        return DANGEROUS_PAYLOAD_PATTERN.matcher(normalized).find();
    }

    /**
     * Sanitiza um texto simples (ex.: nome, cidade, objetivo), removendo blocos perigosos,
     * tags HTML (inclusive aninhadas), entidades HTML perigosas, esquemas javascript:, atributos on*=
     * e caracteres de controle, preservando o apóstrofo simples (') válido em nomes próprios.
     */
    public static String sanitizeSingleLine(String input) {
        if (input == null) {
            return "";
        }
        String bounded = input.length() > MAX_ANALYSIS_LENGTH
                ? input.substring(0, MAX_ANALYSIS_LENGTH)
                : input;
        String clean = stripXssIteratively(Normalizer.normalize(bounded, Normalizer.Form.NFKC));
        clean = clean.replaceAll("[<>\"`]", "");
        clean = clean.replaceAll("[\\p{Cntrl}]", "");
        return clean.trim().replaceAll("\\s{2,}", " ");
    }

    /**
     * Sanitiza um texto multilinha (ex.: bio do perfil), removendo blocos <script>...</script>
     * (inclusive o código interno do script), qualquer tag HTML, entidades perigosas e payloads XSS
     * em loop iterativo até ponto fixo antes de salvar no banco.
     */
    public static String sanitizeMultiLine(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String bounded = input.length() > MAX_ANALYSIS_LENGTH
                ? input.substring(0, MAX_ANALYSIS_LENGTH)
                : input;
        String clean = stripXssIteratively(Normalizer.normalize(bounded, Normalizer.Form.NFKC));
        clean = clean.replaceAll("[<>]", "");
        clean = clean.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "");
        clean = clean.trim();
        return clean.isEmpty() ? null : clean;
    }

    private static String stripXssIteratively(String input) {
        String clean = input.replace("\0", "");
        int pass = 0;
        while (pass < MAX_PASSES) {
            String previous = clean;
            clean = decodeDangerousHtmlEntities(clean);
            clean = SCRIPT_BLOCK_PATTERN.matcher(clean).replaceAll("");
            clean = SELF_CLOSING_DANGEROUS_TAG_PATTERN.matcher(clean).replaceAll("");
            clean = ANY_HTML_TAG_PATTERN.matcher(clean).replaceAll("");
            clean = INLINE_JS_SCHEME_PATTERN.matcher(clean).replaceAll("");
            clean = INLINE_EVENT_HANDLER_PATTERN.matcher(clean).replaceAll("");
            clean = DANGEROUS_CALL_PATTERN.matcher(clean).replaceAll("");
            if (clean.equals(previous)) {
                break;
            }
            pass++;
        }
        return clean;
    }

    private static String decodeDangerousHtmlEntities(String input) {
        String out = DOUBLE_ENCODED_AMP_PATTERN.matcher(input).replaceAll("&");
        out = decodeNumericEntities(out, HEX_ENTITY_PATTERN, 16);
        out = decodeNumericEntities(out, DEC_ENTITY_PATTERN, 10);
        out = LT_ENTITY_PATTERN.matcher(out).replaceAll("<");
        out = GT_ENTITY_PATTERN.matcher(out).replaceAll(">");
        out = QUOT_ENTITY_PATTERN.matcher(out).replaceAll("\"");
        out = APOS_ENTITY_PATTERN.matcher(out).replaceAll("'");
        out = COLON_ENTITY_PATTERN.matcher(out).replaceAll(":");
        return out;
    }

    private static String decodeNumericEntities(String input, Pattern pattern, int radix) {
        Matcher matcher = pattern.matcher(input);
        if (!matcher.find()) {
            return input;
        }
        StringBuilder sb = new StringBuilder(input.length());
        matcher.reset();
        while (matcher.find()) {
            String replacement = "";
            try {
                int codePoint = Integer.parseInt(matcher.group(1), radix);
                if (codePoint >= 32 && codePoint <= Character.MAX_CODE_POINT
                        && (codePoint > 0xFFFF || !Character.isSurrogate((char) codePoint))) {
                    replacement = Character.toString(codePoint);
                }
            } catch (NumberFormatException ignored) {
                replacement = "";
            }
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
