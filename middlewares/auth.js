const { decodeToken } = require("../helpers/crypto");
const { User } = require("../models");

const authentication = async (req, res, next) => {
  try {
    let { access_token } = req.headers;
    console.log("access_token:", access_token);

    if (!access_token) {
      throw { code: 401, msg: "Invalid Token" };
    }

    const isGuest = access_token === "guest-user";

    if (isGuest) return next();

    let decoded = decodeToken(access_token);

    let user = await User.findOne({ where: { id: decoded.id } });

    if (!user) {
      throw { code: 401, msg: "Invalid Token" };
    }

    req.user = { id: user.id, role: user.role, email: user.email };

    next();
  } catch (err) {
    next(err);
  }
};

const authorization = async (req, res, next) => {
  try {
    let { id } = req.params;

    let movie = await Movie.findByPk(id);

    if (!movie) {
      throw { name: "Not Found" };
    }

    if (req.user.role !== "admin") {
      if (movie.authorId !== req.user.id) {
        throw { name: "Forbidden" };
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authentication, authorization };
