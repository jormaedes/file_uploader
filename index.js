import express from 'express';
import path from 'path';
import indexRouter from './routers/index.js';
import signupRouter from './routers/signupRouter.js';
import loginRouter from './routers/loginRouter.js';
import homeUserRouter from './routers/homeUserRouter.js';
import logoutRouter from './routers/logoutRouter.js';
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { prisma } from './lib/prisma.js';

const __dirname = import.meta.dirname;


const app = express();

app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined
    }),
  })
);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use('/', indexRouter);
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/home', homeUserRouter);
app.use('/logout', logoutRouter);

app.use((req, res) => {
  res.status(404).send(`'The page ${req.originalUrl} you are looking for does not exist.'`);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});