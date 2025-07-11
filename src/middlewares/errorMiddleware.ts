import { timeStamp } from "console";
import {Request,Response, NextFunction } from "express"

export const notFound = (req:Request , res:Response , next: NextFunction) =>{
  const error = new Error(`Not Found - ${req.originalUrl}`)
  res.status(404);
  next(error)
}

export const errorHandler = (
err:Error,
req:Request,
res:Response,
next:NextFunction
)=>{
  const statusCode = res.statusCode === 200 ? 500: res.statusCode;
  res.status(statusCode);

  console.error({
    timeStamp : new Date().toISOString(),
    path : req.path,
    method : req.method,
    statusCode : statusCode,
    message : err.message,
    stack: process.env.NODE_ENV === "production" ?  "🥞" : err.stack,
  })

  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ?  "🥞" : err.stack,
  })
}
