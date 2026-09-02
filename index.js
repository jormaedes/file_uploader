import express from 'express';
import path from 'path';
import indexRouter from './routers/index.js';
import signupRouter from './routers/signupRouter.js';
import loginRouter from './routers/loginRouter.js';

const __dirname = import.meta.dirname;

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use('/', indexRouter);
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});