const dotenv = require("dotenv");
const Joi = require("joi");
dotenv.config();

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid("production", "development", "test").required(),
  PORT: Joi.number().default(3000),
  MONGODB_URL: Joi.string().required().description("Mongo DB connection URL"),

  JWT_SECRET: Joi.string().required().description("JWT secret key"),
  JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
    .default(30)
    .description("Access token expiration in minutes"),
  JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
    .default(30)
    .description("Refresh token expiration in days"),
  JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
    .default(10)
    .description("Reset password token expiration in minutes"),
  JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
    .default(10)
    .description("Verify email token expiration in minutes"),

  SMTP_HOST: Joi.string().description("Email SMTP server host"),
  SMTP_PORT: Joi.number().description("Email SMTP server port"),
  SMTP_USERNAME: Joi.string().description("SMTP server username"),
  SMTP_PASSWORD: Joi.string().description("SMTP server password"),
  EMAIL_FROM: Joi.string().description(
    'The "from" field in emails sent by the app'
  ),

  GOOGLEMAP_API_KEY: Joi.string()
    .allow("")
    .default("")
    .description("Google Maps API key"),

  // OAuth
  GOOGLE_CLIENT_ID: Joi.string().description("Google OAuth client ID"),
  GOOGLE_CLIENT_SECRET: Joi.string().description("Google OAuth client secret"),
  GOOGLE_CALLBACK_URL: Joi.string().description("Google OAuth callback URL"),

  FACEBOOK_CLIENT_ID: Joi.string().description("Facebook OAuth client ID"),
  FACEBOOK_CLIENT_SECRET: Joi.string().description(
    "Facebook OAuth client secret"
  ),
  FACEBOOK_CALLBACK_URL: Joi.string().description(
    "Facebook OAuth callback URL"
  ),

  GITHUB_CLIENT_ID: Joi.string().description("GitHub OAuth client ID"),
  GITHUB_CLIENT_SECRET: Joi.string().description("GitHub OAuth client secret"),
  GITHUB_CALLBACK_URL: Joi.string().description("GitHub OAuth callback URL"),

  FRONTEND_URL: Joi.string()
    .default("http://localhost:3000")
    .description("Frontend base URL for OAuth redirects"),
}).unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === "test" ? "-test" : ""),
    options: {},
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes:
      envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  googleMaps: {
    apiKey: envVars.GOOGLEMAP_API_KEY || null,
  },
  frontendUrl: envVars.FRONTEND_URL,
  oauth: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      callbackUrl: envVars.GOOGLE_CALLBACK_URL,
    },
    facebook: {
      clientId: envVars.FACEBOOK_CLIENT_ID,
      clientSecret: envVars.FACEBOOK_CLIENT_SECRET,
      callbackUrl: envVars.FACEBOOK_CALLBACK_URL,
    },
    github: {
      clientId: envVars.GITHUB_CLIENT_ID,
      clientSecret: envVars.GITHUB_CLIENT_SECRET,
      callbackUrl: envVars.GITHUB_CALLBACK_URL,
    },
  },
};
