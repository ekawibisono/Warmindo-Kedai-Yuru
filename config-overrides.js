// config-overrides.js
const JavaScriptObfuscator = require('webpack-obfuscator');

module.exports = function override(config, env) {
  // Code Obfuscation untuk Production (REDUCED SETTINGS untuk menghindari blank white screen)
  if (env === 'production') {
    config.plugins.push(
      new JavaScriptObfuscator(
        {
          // BASIC obfuscation settings - lebih aman
          compact: true,
          controlFlowFlattening: false,  // DISABLED - sering menyebabkan issues
          deadCodeInjection: false,      // DISABLED - bisa rusak React
          disableConsoleOutput: false,   // ENABLED - untuk debugging production
          debugProtection: false,        // DISABLED - allow debugging
          identifierNamesGenerator: 'hexadecimal',
          renameGlobals: false,          // DISABLED - bisa rusak React globals
          selfDefending: false,          // DISABLED - conflict dgn React DevTools
          simplify: true,
          stringArray: true,
          stringArrayThreshold: 0.5,     // REDUCED dari 0.75
          rotateStringArray: true,
          stringArrayEncoding: ['base64'],
          
          // DISABLED aggressive settings
          controlFlowFlatteningThreshold: 0,
          deadCodeInjectionThreshold: 0,
          numbersToExpressions: false,
          splitStrings: false,
          transformObjectKeys: false,
          stringArrayIndexShift: false,
          stringArrayRotate: false,
          stringArrayShuffle: false,
          stringArrayWrappersCount: 1,        // REDUCED
          stringArrayWrappersChainedCalls: false,
          stringArrayWrappersParametersMaxCount: 2,
          stringArrayWrappersType: 'variable',  // SAFER than 'function'
          unicodeEscapeSequence: false,
        },
        ['excluded_bundle_name.js']
      )
    );
  }

  return config;
};