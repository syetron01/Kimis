const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware to parse JSON bodies and allow cross-origin requests
app.use(cors());
app.use(express.json());

const SECRET = "your_super_secret_key";

// Dummy user database (let allows us to add new users)
let users = [
    { id: 1, email: "test@test.com", password: "password123", role: "user" },
    { id: 2, email: "admin@test.com", password: "adminpassword", role: "admin" }
];

app.post("/api/login", (req,res)=>{

 const {email,password} = req.body;

 const user = users.find(u => u.email === email && u.password === password);

 if(!user){
  return res.status(401).json({message:"Invalid credentials"});
 }

 const token = jwt.sign(
  {id:user.id, role:user.role},
  SECRET,
  {expiresIn:"1h"}
 );

 res.json({
  message:"Login successful",
  token:token
 });

});

app.post("/api/register", (req, res) => {
 const { email, password } = req.body;

 if (!email || !password) {
  return res.status(400).json({ message: "Email and password are required" });
 }

 const existingUser = users.find(u => u.email === email);
 if (existingUser) {
  return res.status(409).json({ message: "Email already registered" });
 }

 const newUser = {
  id: users.length + 1,
  email,
  password,
  role: "user" // Default role
 };

 users.push(newUser);

 res.status(201).json({ message: "Registration successful" });
});

app.get("/api/me", authenticateToken, (req, res) => {
 // Find the user details based on the token
 const user = users.find(u => u.id === req.user.id);
 
 if (!user) {
  return res.status(404).json({ message: "User not found" });
 }

 // Return user details without password
 res.json({
  id: user.id,
  email: user.email,
  role: user.role
 });
});

app.get("/api/admin-data", authenticateToken, authorizeRole('admin'), (req, res) => {
 // This endpoint is only accessible if authenticateToken AND authorizeRole('admin') pass
 res.json({
  message: "Sensitive Admin Information Accessed Successfully!",
  serverStatus: "Healthy",
  activeUsers: users.length
 });
});

function authenticateToken(req,res,next){

 const authHeader = req.headers["authorization"];
 const token = authHeader && authHeader.split(" ")[1];

 if(!token){
  return res.sendStatus(401);
 }

 jwt.verify(token,SECRET,(err,user)=>{

  if(err){
   return res.sendStatus(403);
  }

  req.user = user;
  next();

 });

}

function authorizeRole(role){

 return (req,res,next)=>{

  if(req.user.role !== role){
   return res.status(403).json({message:"Access denied"});
  }

  next();

 };

}

app.get('/', (req, res) => {
    res.send('Server is up and running! Please access the login endpoint.');
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});