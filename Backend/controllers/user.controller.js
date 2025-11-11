const mongoose = require("mongoose");
const User = require("../models/user.model");
const bcrypt = require("bcrypt");

const createUser = async(req, res) =>{
    const { email, password} = req.body;
    const hashedPassword= await bcrypt.hash(password, 10);
    try{
        const existingUser= await User.findOne({ email });
        if(existingUser){
            return res.status(400).json({ message: "User already exists" });
        }
        const newUser = new User({
            email,
            password: hashedPassword,
            longitude : 0 ,
            latitude: 0,
            timestamp: Date.now()
        });
        await newUser.save();
        res.status(201).json({message: "User created successfully", user: newUser});
    }
    catch(error){
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const { generateToken, generateRefreshToken } = require('../utils/authutils');

const LoginUser = async (req, res) => {
    const { email, password } = req.body;   
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();
    res.status(200).json({ message: "Login successful", user: { email: user.email, id: user._id }, accessToken, refreshToken });
    } catch (error) {   
        console.error("Error logging in user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const updateUserLocation = async (req, res) => {
    const { longitude, latitude } = req.body;
    const userId = req.params.id;
    try {
        const user = await User.findByIdAndUpdate(userId, {longitude, latitude, timestamp: Date.now()}, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        };
        res.status(200).json({message : "Location updated successfully", user: { email: user.email, id: user._id, longitude: user.longitude, latitude: user.latitude, timestamp: user.timestamp }});
    } catch (error) {
        console.error("Error updating user location:", error);  
    }
}

const getUserLocation = async (req, res) => {
    const userId = req.params.id;   
    try {
        const user = await User.findById(userId).select("longitude latitude timestamp");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user: { email: user.email, id: user._id, longitude: user.longitude, latitude: user.latitude, timestamp: user.timestamp } });
    } catch (error) {
        console.error("Error fetching user location:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const getAllUsers= async (req, res) => {
    try{
        const users = await User.find().select("-password");
        res.status(200).json(users);
    }
    catch(error){
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
module.exports = {createUser, getAllUsers, LoginUser, updateUserLocation, getUserLocation};
