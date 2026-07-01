import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  resumeUrl: {
    type: String,
    default: '',
  },
  resumeParsedData: {
    skills: {
      type: [String],
      default: [],
    },
    experienceLevel: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Remove passwordHash when converting user document to JSON (for API responses)
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

export default mongoose.model('User', UserSchema);
