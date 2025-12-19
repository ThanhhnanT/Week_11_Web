import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import cors from 'cors'


dotenv.config()
const app = express()
app.use(express.json())

app.use(cors())

console.log(process.env.MONGGO_URL)
    mongoose
    .connect("mongodb+srv://20225094:20225094@cluster0.c05jlrx.mongodb.net/IT4409")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB Error:", err))

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2 },
  age: { type: Number, required: true, min: 0 },
  email: { type: String, required: true , match: /^\S+@\S+\.\S+$/},
  address: { type: String, required: false },
})
const User = mongoose.model('User', UserSchema, 'users')


app.get('/',  async (req, res) => {
  res.send('Hello World!')
})

app.get('/api/users', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let search = (req.query.search || "").trim()
    console.log('Search term:', search)
    
    if (page < 1) {
      page = 1
    }
    if (limit > 10) {
      limit = 10
    }
    
    const skip = (page - 1) * limit

    const escapeRegex = (str) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const filter = search
        ? {
        $or: [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
        { 
          $and: [
            { address: { $regex: escapeRegex(search), $options: "i" } },
            { address: { $ne: null } }
          ]
        }
        ]
        }
        : {};
    console.log('Filter:', JSON.stringify(filter, null, 2)) 

    const [users, total] = await Promise.all([
      User.find(filter)
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ])
    const totalPages = Math.ceil(total / limit)
    return res.json({
        page,
        limit,
        total,
        totalPages,
        data: users
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.post('/api/users', async (req, res) => {
  const { name, age, email, address } = req.body

  if (!name || !age || !email || !address) {
    return res.status(400).json({ error: 'Name, age and email are required' })
  }
  if (age < 0) {
    return res.status(400).json({ error: 'Age must be greater than 0' })
  }
  if (!email.match(/^\S+@\S+\.\S+$/)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return res.status(400).json({ error: 'Email already exists' })
  }
  const newUser = new User({ name, age, email, address })
  await newUser.save()
  return res.status(201).json({
    "message": "User created successfully",
    "user": newUser
  })
})

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params
  const { name, age, email, address } = req.body
  try {
    const updatedUser = await User.findByIdAndUpdate(id, { name, age, email, address }, { new: true, runValidators: true, $unset: { address: "" } })
    if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' })
  }
  return res.json({
    "message": "User updated successfully",
    "user": updatedUser
  })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
})

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'User ID is invalid' })
  } 
  const deletedUser = await User.findByIdAndDelete(id)
  if (!deletedUser) {
    return res.status(404).json({ error: 'User not found' })
  }
  return res.json({ message: 'User deleted successfully' })
})  

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})