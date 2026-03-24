const express = require("express");
const passport = require("passport");
const validate = require("../../middlewares/validate");
const authValidation = require("../../validations/auth.validation");
const authController = require("../../controllers/auth.controller");
const oauthController = require("../../controllers/oauth.controller");
const auth = require("../../middlewares/auth");
const config = require("../../config/config");

const router = express.Router();

router.post(
  "/register",
  validate(authValidation.register),
  authController.register
);
router.post("/login", validate(authValidation.login), authController.login);
router.post("/logout", validate(authValidation.logout), authController.logout);
router.post(
  "/refresh-tokens",
  validate(authValidation.refreshTokens),
  authController.refreshTokens
);
router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  validate(authValidation.resetPassword),
  authController.resetPassword
);
router.post(
  "/send-verification-email",
  auth(),
  authController.sendVerificationEmail
);
router.post(
  "/verify-email",
  validate(authValidation.verifyEmail),
  authController.verifyEmail
);
// oauth
const oauthFailureRedirect = `${config.frontendUrl}/login?error=oauth_failed`;
router.get(
  "/oauth/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  })
);
router.get(
  "/oauth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: oauthFailureRedirect,
  }),
  oauthController.handleOAuthCallback
);

router.get(
  "/oauth/facebook",
  passport.authenticate("facebook", { session: false, scope: ["email"] })
);
router.get(
  "/oauth/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: oauthFailureRedirect,
  }),
  oauthController.handleOAuthCallback
);

router.get(
  "/oauth/github",
  passport.authenticate("github", { session: false, scope: ["user:email"] })
);
router.get(
  "/oauth/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: oauthFailureRedirect,
  }),
  oauthController.handleOAuthCallback
);

module.exports = router;
