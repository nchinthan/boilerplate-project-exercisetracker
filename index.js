const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config()
const {User , Exercise} = require('./database');

// --- MIDDLEWARE SETUP (Crucial to be at the top) ---
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(express.json());



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
      _id: savedUser._id.toString() 
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

    const exerciseDate = date ? new Date(date) : new Date();

    const newExercise = new Exercise({
      username: user.username,
      description: description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    await newExercise.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: Number(newExercise.duration),
      date: newExercise.date.toDateString(),
      _id: user._id.toString() 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let filterObj = { user_id: userId };

    if (from || to) {
      filterObj.date = {};
      if (from) filterObj.date.$gte = new Date(from.replace(/-/g, '\/'));
      if (to) filterObj.date.$lte = new Date(to.replace(/-/g, '\/'));
    }

    let queryChain = Exercise.find(filterObj);

    if (limit) {
      queryChain = queryChain.limit(parseInt(limit));
    }

    const exercises = await queryChain.exec();

    const logArray = exercises.map(ex => ({
      description: ex.description,
      duration: parseInt(ex.duration), 
      date: ex.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: logArray.length,
      _id: user._id.toString(), 
      log: logArray
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exercise logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})