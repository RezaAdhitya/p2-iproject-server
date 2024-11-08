const { User } = require("../models");
const { OAuth2Client } = require("google-auth-library");
const { comparePassword, createToken } = require("../helpers/crypto");
const querystring = require("querystring");
const axios = require("axios");

const BASE_URL = "http://localhost:5173"; // dev
// const BASE_URL = 'https://chillclouds-ipro.web.app'  // prod

class userController {
  // * Google login
  static async googleLogin(req, res, next) {
    try {
      const oAuth2Client = new OAuth2Client(process.env.GOOGLE_ID);
      const result = await oAuth2Client.verifyIdToken({
        idToken: req.body.idToken,
        expectedAudience: process.env.GOOGLE_ID,
      });

      const payload = await result.getPayload();

      console.log(payload, "yang ini");
      let [created] = await User.findOrCreate({
        where: { email: payload.email },
        defaults: {
          username: `${payload.given_name}_${payload.family_name}`,
          email: payload.email,
          password: "customer-google-login",
          role: "user",
        },
        hooks: false,
      });

      let token = createToken({
        id: created.id,
        username: created.username,
        email: created.email,
        role: created.role,
      });

      console.log(token, "cekini");

      res.status(200).json({ access_token: token });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  // * User register
  static async register(req, res, next) {
    try {
      let { username, email, password } = req.body;

      let createdUser = await User.create({
        username,
        email,
        password,
        role: "user",
      });

      res.status(201).json({
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  // * User login
  static async login(req, res, next) {
    try {
      let { email, password } = req.body;
      if (!email) {
        throw { code: 400, msg: "Email is required" };
      }

      if (!password) {
        throw { code: 400, msg: "Password is required" };
      }

      let user = await User.findOne({ where: { email } });

      if (!user) {
        throw { code: 401, msg: "Invalid email / password" };
      }

      let compared = comparePassword(password, user.password);

      if (!compared) {
        throw { code: 401, msg: "Invalid email / password" };
      }

      let token = createToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(200).json({ access_token: token });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  static async spotifyLogin(req, res, next) {
    try {
      let client_id = process.env.SPOTIFY_CLIENT_ID;
      let redirect_uri = `${BASE_URL}/callbacks`;
      let state = (Math.random() + 1).toString(36).substring(7);
      let scope =
        "playlist-modify-public user-library-modify user-read-private user-read-email";
      res.json({
        url:
          "https://accounts.spotify.com/authorize?" +
          querystring.stringify({
            response_type: "code",
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
          }),
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  static async getAuthToken(req, res, next) {
    try {
      let code = req.body.code;
      let redirect_uri = `${BASE_URL}/callbacks`;
      let client_id = process.env.SPOTIFY_CLIENT_ID;
      let client_secret = process.env.SPOTIFY_CLIENT_SECRET;
      let { data } = await axios({
        method: "post",
        url: "https://accounts.spotify.com/api/token",
        headers: {
          Authorization: "Basic " + btoa(client_id + ":" + client_secret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: {
          code,
          redirect_uri,
          grant_type: "authorization_code",
        },
      });
      res.status(200).json({ data });
    } catch (err) {
      console.log(err, "this");
    }
  }

  static async getMe(req, res, next) {
    try {
      let token = req.body.code;
      let { data } = await axios({
        method: "get",
        url: `https://api.spotify.com/v1/me`,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      console.log(data, "userdata");
      res.status(200).json(data);
    } catch (err) {
      console.log(err.response.data, "ERR");
    }
  }

  static async spotifyFinalAuth(req, res, next) {
    try {
      let { payload } = req.body;

      let [created] = await User.findOrCreate({
        where: { email: payload.email },
        defaults: {
          username: `${payload.username}-chillclouds`,
          email: payload.email,
          password: "customer-spotify-login",
          role: "user",
        },
        hooks: false,
      });

      let token = createToken({
        id: created.id,
        username: created.username,
        email: created.email,
        role: created.role,
      });

      res.status(200).json({ access_token: token });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
}

module.exports = userController;
