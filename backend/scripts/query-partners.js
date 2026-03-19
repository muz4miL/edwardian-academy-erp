require("dotenv").config();
const m = require("mongoose");
m.connect(process.env.MONGODB_URI).then(async () => {
  const Teacher = require("../models/Teacher");
  const t = await Teacher.find({ role: { $in: ["OWNER", "PARTNER"] } })
    .select("name role username plainPassword userId")
    .lean();
  console.log(JSON.stringify(t, null, 2));
  await m.disconnect();
});
