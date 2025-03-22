import User from "../models/user.model.js"
import Message from "../models/message.models.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id // getting req.user from next() by protectRoute
        console.log(` getSidebar is : ${loggedInUserId}`);
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password"); // Automatically got default id will be get by mongodb default
        return res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error in getUsersForSidebar : ", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: receiverChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: receiverChatId },  // you will getMessages here
                { senderId: receiverChatId, receiverId: myId }
            ]
        })

        return res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller : ", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;

        if (image) {
            // To get base64 image (basically binary code of image data)
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url // getting url of image from cloudinary.
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        io.to(receiverSocketId).emit("newMessage", newMessage)

        // Realtime functionality through socket.io

        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in sendMessageController : ", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}