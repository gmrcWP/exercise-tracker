const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected')).catch(err => console.log(err));

//SCHEMAS   
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
});

//MODELS
const User = mongoose.model('username', userSchema);
const Exercise = mongoose.model('exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users').get(async function (req, res) {
  try {
    const usersList = await User.find();
    res.send(usersList);
  } catch (err) {
    console.log(err);
    res.status(500).send(console.log('Failed to retrieve users'));
  }
}).post(async function (req, res) {
  try {
    const newUser = new User({ username: req.body.username });
    const saveUser = await newUser.save();
    res.send({ username: req.body.username, _id: saveUser._id });
  } catch (err) {
    console.log(err);
    res.send({ error: 'Failed to create user' });
  }
});

app.post('/api/users/:_id/exercises', async function (req, res) {
  const id = req.params._id;
  const { description, date } = req.body;
  const duration = Number(req.body.duration);

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.send({ error: 'User not found' });
    }

    const exercise = new Exercise({
      user_id: id,
      username: user.username,
      description,
      duration,
      date: date ? new Date(date).toDateString() : new Date().toDateString()
    });

    const savedExercise = await exercise.save();

    res.send({
      username: user.username,
      description,
      duration,
      date: savedExercise.date.toDateString(),
      _id: savedExercise.user_id
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: 'Failed to create exercise' });
  }
});

app.get('/api/users/:_id/logs', async function (req, res) {
  const { from, to, limit } = req.query;
  try {
    const user = await User.findById(req.params._id);
    if (!user) {
      res.send({ error: 'Could not find user' });
      return;
    }

    let dateObj = {};

    if (from) {
      dateObj["$gte"] = new Date(from);
    }
    if (to) {
      dateObj["$lte"] = new Date(to);
    }

    let filter = { user_id: user._id };

    if (from || to) {
      filter.date = dateObj;
    }

    const userLogs = await Exercise.find(filter).limit(Number(limit) || 10);

    const logsObj = userLogs.map(element => ({
      description: element.description,
      duration: element.duration,
      date: new Date(element.date).toDateString()
    }));

    res.send({
      username: user.username,
      count: userLogs.length,
      _id: user._id,
      log: logsObj
    });

  } catch (err) {
    console.log(err);
    res.send({ error: 'Failed to search logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})