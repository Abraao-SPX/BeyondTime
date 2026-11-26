const fs = require('fs');
const path = require('path');

/**
 * Configuração dinâmica do Expo (AUD-008 / AUD-009):
 * - usesCleartextTraffic fica habilitado APENAS em APP_ENV=development (falso em preview/production).
 * - googleServicesFile é anexado apenas quando o arquivo existe localmente ou via segredo EAS.
 */
module.exports = ({ config }) => {
  const isDevEnv = process.env.APP_ENV === 'development';
  const googleServicesPath =
    process.env.GOOGLE_SERVICES_JSON || path.resolve(__dirname, 'google-services.json');
  const hasGoogleServices = fs.existsSync(googleServicesPath);

  const plugins = (config.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      return [
        'expo-build-properties',
        {
          ...plugin[1],
          android: {
            ...(plugin[1]?.android || {}),
            usesCleartextTraffic: isDevEnv,
          },
        },
      ];
    }
    return plugin;
  });

  const androidConfig = {
    ...(config.android || {}),
  };
  if (hasGoogleServices) {
    androidConfig.googleServicesFile = googleServicesPath;
  } else {
    delete androidConfig.googleServicesFile;
  }

  return {
    ...config,
    android: androidConfig,
    plugins,
  };
};
