const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const axios = require("axios");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.set("view engine", "ejs");

// require("dotenv").config(); // Load environment variables, not working for now. 
///////

const fs = require("fs");


// Middleware to parse JSON data
app.use(express.json());


////


app.use(express.static(path.join(__dirname, "/views")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// WeatherBudy API Key
const API_KEY = "1bd54b31a2b58876a9f3d94a42736a02";
const CITY_NAME = "Montreal";

// Passport/Google Config
const GOOGLE_CLIENT_ID = "319549218879-0j13ugguknb0b5b6o2lfeii9ngguq14d.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

//Passport/Facebook Config
const Facebook_CLIENT_ID = "1092481865083604";
const Facebook_CLIENT_SECRET = "433692b32df574227fd1a98328db3863";

app.use(
  session({
    secret: "cats", // Replace with a strong, secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 7200000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/google/callback",
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: Facebook_CLIENT_ID,
      clientSecret: Facebook_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/callback"
    },
    function (request, accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
    }
  )
)

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

function isAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.sendStatus(401);
  }
}

function toCelsius(kelvin) {
  return Math.round(kelvin - 273.15);
}

app.get("/", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${CITY_NAME}&appid=${API_KEY}`
    );
    const data = response.data;
    const tempInKelvin = data.main.temp;
    const temperature = toCelsius(tempInKelvin);
    res.render("index", {
      title: "Homepage",
      temperature,
      city: CITY_NAME,
      data,
      toCelsius,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("API call failed.");
  }

});

app.get("/city", async (req, res) => {
  const city = req.query.city;

  if (!city || city.trim() === "") {
      // If it's empty, redirect to the home page
      res.redirect("/");
      return; //
    }
    
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
    );
    const data = response.data;
    const tempInKelvin = data.main.temp;
    const temperature = toCelsius(tempInKelvin);
    res.render("index", {
      title: "Homepage",
      temperature,
      data,
      toCelsius,
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).send("API call failed.");
  }
});

app.get("/forecast", async (req, res) => {
  const city = req.query.city || "Montreal";
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}`
    );
    const data = response.data;

    const forecastData = {};

    data.list.forEach((item) => {
      const dateString = item.dt_txt.split(" ")[0];
      if (forecastData.hasOwnProperty(dateString)) {
        forecastData[dateString].push(item);
      } else {
        forecastData[dateString] = [item];
      }
    });

   
    function getDayOfWeek(dateString) {
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat','Sun'];
      const date = new Date(dateString);
      const dayIndex = date.getDay();
      return daysOfWeek[dayIndex];
    }
    function formatDate(dateString) {
      const date = new Date(dateString);
      const options = { month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    }
  

    for (const date in forecastData) {
      forecastData[date].forEach((item) => {
        item.dayOfWeek = getDayOfWeek(date);
      });
    }

    res.render("forecast", {
      title: "Forecast for " + data.city.name,
      data,
      forecastData,
      toCelsius,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("API call failed.");
  }
});

app.get("/login", (req, res) => {
  res.render("login", { title: "Login Page" });
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About" });
});

app.get("/api/documentation", (req, res) => {
  res.render("api", { title: "Weather API Documentation" });
});

//Google login route 
app.get("/auth/google", (req, res) => {

  // Script in the response that retrieves the geolocation and redirects to the Google OAuth URL
  const geolocationScript = `
    <script>
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          const authUrl = "/google/callback?lat=" + latitude + "&lon=" + longitude;
          window.location.href = authUrl;
        });
      } else {
        alert("Geolocation is not available in your browser.");
      }
    </script>
  `;

  // Send the script as part of the response
  res.send(geolocationScript);
});

//Google callback route
app.get(
  "/google/callback",
  passport.authenticate("google", {
    scope:["email", "profile"],
    successRedirect: "/userProfile",
    failureRedirect: "/login",
  })
);

// Facebook login route
app.get("/auth/facebook", 
passport.authenticate("facebook", { 
  scope: ["email", "public_profile"] }));

// Facebook callback route
app.get("/auth/facebook/callback", passport.authenticate("facebook", {
  successRedirect: "/userProfile",
  failureRedirect: "/login",
}));

app.get("/userProfile", isAuth, async (req, res) => {
  const city = req.query.city || "Montreal";
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
    );
    const data = response.data;
    const temperature = toCelsius(data.main.temp);
    
    res.render("userProfile", {
      greeting: `Hello, ${req.user.displayName}`,
      title: "",
      data,
      toCelsius,
      
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("API call failed.");
  }
});

app.get("/logout", (req, res) => {
  req.logout(function(err) {
    if (err) {
      // Handle any errors that occur during the logout process
      console.error(err);
      return next(err);
    }
    // Redirect the user to a different page after logout
    req.session.destroy(function() {
      res.redirect("/"); 
    });
  });
});

// Define a route to get weather data
app.get("/api/weather", (req, res) => {
  try {
    const filePath = path.join(__dirname, "api.json");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve weather data" });
  }
});


app.use((req, res) => {
  res.status(404).render("404", { title: "404" });
});

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});