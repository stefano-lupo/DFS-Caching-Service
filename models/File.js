import mongoose from 'mongoose';


const clientSchema = mongoose.Schema({}, {timestamps: true});

const fileSchema = mongoose.Schema({
    version: {
      type: Number,
      default: 0
    },
    subscribedClients: [clientSchema]
  }, {
    timestamps: true
  }
);

// Compile schema into model BEFORE compilation
let File = mongoose.model('File', fileSchema);

module.exports = {
  File,
};
