const axios = require("axios");
// const { Configuration, OpenAIApi } = require("openai");
const { OpenAI } = require("openai");

class mainController {
  //? Weather API
  static async getWeather(req, res, next) {
    try {
      let api_key = process.env.OPEN_WEATHER_API_KEY;
      console.log("api_key:", api_key);
      let { latitude, longitude } = req.body;

      console.log(latitude, longitude);

      if (!latitude || !longitude) {
        throw { code: 400, msg: "Coordinates are required" };
      }

      let { data } = await axios({
        method: "get",
        url: `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${api_key}&units=metric`,
      });
      res.status(200).json({
        nearest_station: data.name,
        weather: data.weather,
        temp: data.main.temp,
      });
    } catch (err) {
      console.log(err, "yang ini?");
      next(err);
    }
  }

  //? OpenAI query suggestion
  static async generateAIAnswer(req, res, next) {
    try {
      let searchQuery = req.body.searchQuery;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `suggest 1 music search query for ${searchQuery} weather condition in 3 words without the word "playlist" and "scattered" and some creative twist`,
          },
        ],
        temperature: 0.9,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 2,
        presence_penalty: 2,
      });

      res.status(200).json({
        response: response.choices[0].message.content
          .trim()
          .replaceAll('"', ""),
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  //? Spotify API Sequence
  static async fetchPlaylist(req, res, next) {
    try {
      let searchQuery = req.body.searchQuery;
      let token = await mainController.getAuthToken();
      let data = await mainController.getPlaylist(token, searchQuery);
      res.status(200).json(
        data.items
          .map((el) => {
            let playlist_data = {
              playlist_title: el.name,
              playlist_owner: el.owner.display_name,
              playlist_tracks: el.tracks.href,
              playlist_link: el.external_urls.spotify,
              playlist_image: el.images[0].url,
            };
            return playlist_data;
          })
          .slice(0, 12)
      );
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  static async fetchTracks(req, res, next) {
    try {
      let url = req.body.url; //? This url is obtained from fetch playlist
      let token = await mainController.getAuthToken();
      console.log(token, url, "check this");
      let data = await mainController.getTracks(token, url);
      let randomStart = Math.floor(Math.random() * (data.items.length - 5));
      let randomEnd = randomStart + 5;
      res.status(200).json(
        data.items.slice(randomStart, randomEnd).map((el) => {
          let data = {
            track_name: el.track.name,
            track_artist: el.track.artists[0].name,
            track_link: el.track.external_urls.spotify,
            artist_link: el.track.artists[0].external_urls.spotify,
            album_image: el.track.album.images[1].url,
          };
          return data;
        })
      );
    } catch (err) {
      console.log(err);
    }
  }

  static async getTracks(token, url) {
    try {
      let { data } = await axios({
        method: "get",
        url: url,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  // * GET OAUTH2 TOKEN
  static async getAuthToken() {
    try {
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
          grant_type: "client_credentials",
        },
      });
      let access_token = data.access_token;
      return access_token;
    } catch (err) {
      // TODO - How to pass this err to error handler
      console.log(err);
    }
  }

  // * GET PLAYLIST
  static async getPlaylist(token, query) {
    try {
      let normalized = query.replaceAll(" ", "%20");
      let { data } = await axios({
        method: "get",
        url: `https://api.spotify.com/v1/search?q=${normalized}&type=playlist`,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      console.log("CURRENT WEATHER: ", query);
      return data.playlists;
    } catch (err) {
      // TODO - How to pass this err to error handler
      console.log(err);
    }
  }
}

module.exports = mainController;
