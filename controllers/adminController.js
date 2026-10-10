import Admin from "../models/admin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export function saveAdmin(req,res){
    console.log(req.body)
    
    const hashedPassword = bcrypt.hashSync(req.body.password,10);
    const admin = new Admin({
        email:req.body.email,
        password:hashedPassword
    })
    admin.save()
    .then(() => {
        res.status(201).json({message:"Admin saved successfully"});
    })
    .catch((error) => {
        res.status(500).json({message:error.message});
    })
}
export function loginUser(req,res){
    const email = req.body.email;
    const password = req.body.password;
    Admin.findOne({email : email}).then((admin)=>{
        if(admin == null){
           return res.status(404).json({message:"Authentication Failed"});
        }else{
            const isPasswordValid=bcrypt.compareSync(password,admin.password);
                if(isPasswordValid){
                    const adminData={
                        email: admin.email
                    }
            const token = jwt.sign(adminData, process.env.JWT_KEY);
                    res.json({
                        message:"Login successfull",
                        token: token,
                        admin:adminData

                    });
                }else{
                return res.status(401).json({ message: "Authentication failed" });
                }
        }
    }).catch(() => {
        res.status(500).json({ message: "Error logging in" });
    });
}