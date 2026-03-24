const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: FacebookStrategy } = require("passport-facebook");
const { Strategy: GithubStrategy } = require("passport-github2");
const config = require("./config");
const { tokenTypes } = require("./tokens");
const { User } = require("../models");

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error("Invalid token type");
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

// ─── Shared OAuth verify factory ─────────────────────────────────────────────

const oauthVerify =
  (provider) => async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(
          new Error(
            `No email returned from ${provider}. Please ensure your ${provider} account has a verified email.`
          ),
          false
        );
      }

      const user = await User.findOrCreateOAuthUser({
        provider,
        providerId: profile.id,
        email,
        name: profile.displayName || profile.username || email.split("@")[0],
      });

      done(null, user);
    } catch (err) {
      done(err, false);
    }
  };

// ─── Google Strategy ──────────────────────────────────────────────────────────

const googleStrategy = new GoogleStrategy(
  {
    clientID: config.oauth.google.clientId,
    clientSecret: config.oauth.google.clientSecret,
    callbackURL: config.oauth.google.callbackUrl,
    scope: ["profile", "email"],
  },
  oauthVerify("google")
);

// ─── Facebook Strategy ────────────────────────────────────────────────────────

const facebookStrategy = new FacebookStrategy(
  {
    clientID: config.oauth.facebook.clientId,
    clientSecret: config.oauth.facebook.clientSecret,
    callbackURL: config.oauth.facebook.callbackUrl,
    profileFields: ["id", "displayName", "emails"],
  },
  oauthVerify("facebook")
);

// ─── GitHub Strategy ──────────────────────────────────────────────────────────

const githubStrategy = new GithubStrategy(
  {
    clientID: config.oauth.github.clientId,
    clientSecret: config.oauth.github.clientSecret,
    callbackURL: config.oauth.github.callbackUrl,
    scope: ["user:email"],
  },
  oauthVerify("github")
);

module.exports = {
  jwtStrategy,
  googleStrategy,
  facebookStrategy,
  githubStrategy,
};
