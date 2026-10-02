import "dotenv/config"; // MUST BE THE VERY FIRST LINE
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        
        // 1. Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // 2. Check if user exists by email (maybe they registered with password/OTP first)
          user = await User.findOne({ email });

          if (user) {
            // ⚠️ SAFETY CHECK: Email exists but is linked to a DIFFERENT Google account
            if (user.googleId && user.googleId !== profile.id) {
              return done(null, false, { 
                message: "This email is already associated with a different Google account." 
              });
            }
            
            // ✅ Safe to link: Link Google account to existing user
            user.googleId = profile.id;
            user.avatar = profile.photos?.[0]?.value;
            await user.save();
          } else {
            // ✅ Completely new user: Create from Google profile
            user = await User.create({
              name: profile.displayName,
              email: email,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value,
              needsOnboarding: true, // Flag them to choose Customer/Seller role
            });
          }
        }
        
        done(null, user);
      } catch (error) {
        done(error as Error, false);
      }
    }
  )
);

// Serialize and Deserialize user (Required by Passport)
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error as Error, null);
  }
});

export default passport;