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
    
    // Returns User Structure
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// 2. GET /api/users - Fetch array of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 3. POST /api/users/:_id/exercises - Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Handle incoming empty date parameters correctly. 
    // If empty string or undefined, fallback immediately to the current date.
    let exerciseDate = date ? new Date(date) : new Date();
    
    // If an invalid date string was provided, fall back to current date
    if (isNaN(exerciseDate.getTime())) {
      exerciseDate = new Date();
    }

    const newExercise = new Exercise({
      user_id: userId,
      description: description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    await newExercise.save();

    // Returns Exercise Structure
    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// 4. GET /api/users/:_id/logs - Retrieve a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Construct base query object filtered by the user ID
    let filterObj = { user_id: userId };

    // Check for optional "from" and "to" date filters
    if (from || to) {
      filterObj.date = {};
      if (from) filterObj.date.$gte = new Date(from);
      if (to) filterObj.date.$lte = new Date(to);
    }

    // Prepare execution chain
    let queryChain = Exercise.find(filterObj);

    if (limit) {
      queryChain = queryChain.limit(parseInt(limit));
    }

    const exercises = await queryChain.exec();

    // Format array elements using .toDateString()
    const logArray = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    // Returns Log Structure
    res.json({
      username: user.username,
      count: logArray.length,
      _id: user._id,
      log: logArray
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exercise logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
