const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_KEY = process.env.JWT_KEY; // TODO - Store this in the .env file later

module.exports = {
  hashPassword(password) {
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(password, salt);
    return hash;
  },

  comparePassword(password, hashed) {
    return bcrypt.compareSync(password, hashed);
  },

  createToken(payload) {
    console.log("JWT_KEY nya", JWT_KEY);
    return jwt.sign(payload, JWT_KEY);
  },

  decodeToken(token) {
    return jwt.decode(token, JWT_KEY);
  },
};
