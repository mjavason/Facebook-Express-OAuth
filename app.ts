import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import session from 'express-session'; // Don't forget to add this import

//#region Keys and Constants
dotenv.config({ path: './.env' });
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:{PORT}`;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'xxx'; // Your App ID
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'xxx'; // Your App Secret
const SWAGGER_OPTIONS = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Typescript SFA',
      version: '1.0.0',
      description:
        'This is a single file typescript template app for faster idea testing and prototyping. It contains tests, one demo root API call, basic async error handling, one demo axios call and .env support.',
      contact: {
        name: 'Orji Michael',
        email: 'orjimichael4886@gmail.com',
      },
    },
    servers: [
      {
        url: BASE_URL,
      },
    ],
    tags: [
      {
        name: 'Default',
        description: 'Default API Operations that come inbuilt',
      },
    ],
  },
  apis: ['**/*.ts'],
};

//#endregion Keys and Constants

//#region App Setup
const app = express();
const swaggerSpec = swaggerJSDoc(SWAGGER_OPTIONS);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(morgan('dev'));
app.use(
  session({ secret: 'your-secret-key', resave: true, saveUninitialized: true })
);
app.use(passport.initialize());
app.use(passport.session());

//#endregion App setup

//#region Configs
passport.serializeUser(function (user: any, done: any) {
  done(null, user);
});
passport.deserializeUser(function (obj: any, done: any) {
  done(null, obj);
});
passport.use(
  new FacebookStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      callbackURL: `${BASE_URL}/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'photos', 'email'], // Specify what fields you want from the user's profile
    },
    function (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: any
    ) {
      // Handle the authenticated user profile here
      // You can save the profile to your database or session
      return done(null, profile);
    }
  )
);
//#endregion

//#region Code here

/**
 * @swagger
 * /auth/facebook:
 *   get:
 *     summary: Redirects to Facebook for authentication
 *     description: Initiates the Facebook authentication process.
 *     tags: [Auth]
 *     responses:
 *       '302':
 *         description: Redirects to Facebook.
 */
app.get('/auth/facebook', passport.authenticate('facebook'));

/**
 * @swagger
 * /auth/facebook/callback:
 *   get:
 *     summary: Facebook authentication callback
 *     description: Handles the callback after Facebook authentication.
 *     tags: [Auth]
 *     responses:
 *       '302':
 *         description: Redirects to the home page on successful authentication.
 *       '401':
 *         description: Authentication failed.
 */
app.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function (req: Request, res: Response) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Home page
 *     description: Displays the user's information if authenticated.
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '401':
 *         description: Not authenticated.
 */
app.get('/', (req: Request, res: Response) => {
  res.send(
    req.isAuthenticated()
      ? { success: true, message: 'Logged in successfully', user: req.user }
      : 'You are not logged in'
  );
});
//#endregion

//#region Server Setup

// Function to ping the server itself
async function pingSelf() {
  try {
    const { data } = await axios.get(`${BASE_URL}`);
    console.log(`Server pinged successfully: ${data.message}`);
    return true;
  } catch (e: any) {
    console.error(`Error pinging server: ${e.message}`);
    return false;
  }
}

// Route for external API call
/**
 * @swagger
 * /api:
 *   get:
 *     summary: Call a demo external API (httpbin.org)
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/api', async (req: Request, res: Response) => {
  try {
    const result = await axios.get('https://httpbin.org');
    return res.send({
      message: 'Demo API called (httpbin.org)',
      data: result.status,
    });
  } catch (error: any) {
    console.error('Error calling external API:', error.message);
    return res.status(500).send({ error: 'Failed to call external API' });
  }
});

// Route for health check

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API Health check
 *     description: Returns a message indicating that the API is live.
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: API is live.
 */
app.get('/health', (req: Request, res: Response) => {
  return res.send({ message: 'API is Live!' });
});

// Middleware to handle 404 Not Found
/**
 * @swagger
 * /obviously/this/route/cant/exist:
 *   get:
 *     summary: API 404 Response
 *     description: Returns a non-crashing result when you try to run a route that doesn't exist
 *     tags: [Default]
 *     responses:
 *       '404':
 *         description: Route not found
 */
app.use((req: Request, res: Response) => {
  return res
    .status(404)
    .json({ success: false, message: 'API route does not exist' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // throw Error('This is a sample error');

  console.log(`${'\x1b[31m'}${err.message}${'\x1b][0m]'} `);
  return res
    .status(500)
    .send({ success: false, status: 500, message: err.message });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});

// (for render services) Keep the API awake by pinging it periodically
// setInterval(pingSelf, 600000);

//#endregion
