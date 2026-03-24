const catchAsync = require("../utils/catchAsync");
const { tokenService } = require("../services");
const config = require("../config/config");

const handleOAuthCallback = catchAsync(async (req, res) => {
  const tokens = await tokenService.generateAuthTokens(req.user);

  const redirectUrl = new URL(`${config.frontendUrl}/oauth/callback`);
  redirectUrl.searchParams.set("accessToken", tokens.access.token);
  redirectUrl.searchParams.set("refreshToken", tokens.refresh.token);

  res.redirect(redirectUrl.toString());
});

const handleOAuthCallbackJson = catchAsync(async (req, res) => {
  const tokens = await tokenService.generateAuthTokens(req.user);
  res.send({ user: req.user, tokens });
});

module.exports = {
  handleOAuthCallback,
  handleOAuthCallbackJson,
};
