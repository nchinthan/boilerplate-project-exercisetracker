const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// 1. POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error creating user' });
  }
});

// 2. GET /api/users - Get an array of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// 3. POST /api/users/:_id/exercises - Add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Handle optional date string. If empty/missing, use current date
    const exerciseDate = date ? new Date(date) : new Date();

    const newExercise = new Exercise({
      user_id: userId,
      description: description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    await newExercise.save();

    // The test requires an object combining user info and specific exercise info
    // Date must be formatted as an English text representation string (e.g., "Mon Jan 01 1990")
    res.json({
      _id: user._id,
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error adding exercise' });
  }
});

// 4. GET /api/users/:_id/logs - Get a user's exercise log with optional queries
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query; // Optional parameters

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build the query object for exercises
    let queryObj = { user_id: userId };

    if (from || to) {
      queryObj.date = {};
      if (from) queryObj.date.$gte = new Date(from);
      if (to) queryObj.date.$lte = new Date(to);
    }

    // Prepare the database query
    let exerciseQuery = Exercise.find(queryObj);

    if (limit) {
      exerciseQuery = exerciseQuery.limit(parseInt(limit));
    }

    const exercises = await exerciseQuery.exec();

    // Map logs array into the exact string formatting expected by FCC tests
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length, // Include the number of logs returned
      log: log
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching logs' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
