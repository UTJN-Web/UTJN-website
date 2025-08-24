# authentication/use_case/user/user_controller.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from authentication.data_access.data_access import get_user_sub
from authentication.data_access.user_repository import UserRepository
from authentication.data_access.cognito_idp_actions import CognitoIdentityProviderWrapper

user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("")
async def get_all_users():
    """Get all users for admin dashboard"""
    try:
        print("👥 Getting all users for admin dashboard")
        
        # Initialize user repository (no need to connect/disconnect with global pool)
        user_repo = UserRepository()
        
        try:
            # Get all users from database
            db_users = await user_repo.get_all_users()
            print(f"✅ Retrieved {len(db_users)} users from database")
            
            # Build map by email for quick lookup (lowercased for safety)
            email_to_db_user = {u["email"].lower(): u for u in db_users}
            
            # Start with formatted DB users (they already have full profiles)
            formatted_users = []
            for user in db_users:
                formatted_users.append({
                    "id": user["id"],
                    "firstName": user["firstName"],
                    "lastName": user["lastName"],
                    "email": user["email"],
                    "major": user["major"],
                    "graduationYear": user["graduationYear"],
                    "cognitoSub": user["cognitoSub"],
                    "joinedAt": user["joinedAt"].isoformat() if user["joinedAt"] else None,
                    "hasProfile": True,
                })
            
            # Also list users from Cognito to include those who haven't completed a profile yet
            try:
                cognito = CognitoIdentityProviderWrapper()
                cognito_users = cognito.list_users() or []
                print(f"🔎 Retrieved {len(cognito_users)} users from Cognito user pool")
                
                for cu in cognito_users:
                    # Extract email from Cognito attributes
                    attrs = cu.get("Attributes", [])
                    email = None
                    for a in attrs:
                        if a.get("Name") == "email":
                            email = a.get("Value")
                            break
                    if not email:
                        continue
                    if email.lower() in email_to_db_user:
                        # Already included from DB
                        continue
                    # Include minimal stub for Cognito-only users
                    formatted_users.append({
                        "id": None,
                        "firstName": "",
                        "lastName": "",
                        "email": email,
                        "major": "",
                        "graduationYear": 0,
                        "cognitoSub": cu.get("Username"),
                        "joinedAt": (cu.get("UserCreateDate").isoformat() if cu.get("UserCreateDate") else None),
                        "hasProfile": False,
                    })
            except Exception as e:
                # If Cognito listing fails, proceed with DB users only but log it
                print(f"⚠️ Failed to list Cognito users: {e}")
            
            return formatted_users
        except Exception as e:
            print(f"❌ Database error: {e}")
            raise e
            
    except Exception as e:
        print(f"❌ Controller error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve users: {str(e)}")

class UserProfileRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    major: str
    graduationYear: int
    currentYear: str
    university: str

class UserProfileResponse(BaseModel):
    id: int
    firstName: str
    lastName: str
    email: str
    major: str
    graduationYear: int
    currentYear: str
    university: str
    cognitoSub: str
    joinedAt: str

@user_router.post("/profile")
async def create_user_profile(user_data: UserProfileRequest):
    try:
        # Get Cognito sub for the user
        cognito_sub = get_user_sub(user_data.email)
        
        if cognito_sub is None:
            raise HTTPException(status_code=400, detail="User not found in Cognito. Please sign up first.")
        
        # Initialize user repository (no need to connect/disconnect with global pool)
        user_repo = UserRepository()
        
        try:
            # Ensure tables exist with proper constraints
            await user_repo.ensure_tables_exist()
            
            # Check if user already exists
            existing_user = await user_repo.get_user_by_email(user_data.email)
            
            if existing_user:
                # Update existing user
                print(f"🔄 Updating existing user: {user_data.email}")
                db_user = await user_repo.update_user({
                    "firstName": user_data.firstName,
                    "lastName": user_data.lastName,
                    "email": user_data.email,
                    "major": user_data.major,
                    "graduationYear": user_data.graduationYear,
                    "currentYear": user_data.currentYear,
                    "university": user_data.university,
                    "cognitoSub": cognito_sub,
                })
                message = "User profile updated successfully"
            else:
                # Create new user
                print(f"🆕 Creating new user: {user_data.email}")
                db_user = await user_repo.create_user({
                    "firstName": user_data.firstName,
                    "lastName": user_data.lastName,
                    "email": user_data.email,
                    "major": user_data.major,
                    "graduationYear": user_data.graduationYear,
                    "currentYear": user_data.currentYear,
                    "university": user_data.university,
                    "cognitoSub": cognito_sub,
                })
                message = "User profile created successfully"
            
            return {
                "success": True,
                "message": message,
                "user": {
                    "id": db_user["id"],
                    "firstName": db_user["firstName"],
                    "lastName": db_user["lastName"],
                    "email": db_user["email"],
                    "major": db_user["major"],
                    "graduationYear": db_user["graduationYear"],
                    "currentYear": db_user["currentYear"],
                    "university": user_data.university,
                    "cognitoSub": db_user["cognitoSub"]
                }
            }
        except Exception as e:
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user profile: {str(e)}")

@user_router.get("/profile/{email}")
async def get_user_profile(email: str):
    """Get user profile by email"""
    try:
        print(f"🔍 Getting user profile for email: {email}")
        
        # Initialize user repository (no need to connect/disconnect with global pool)
        user_repo = UserRepository()
        
        try:
            # Get user from database
            print(f"🔍 Querying database for user: {email}")
            db_user = await user_repo.get_user_by_email(email)
            
            if not db_user:
                print(f"❌ User not found in database: {email}")
                raise HTTPException(status_code=404, detail="User profile not found")
            
            print(f"✅ User found in database: {db_user}")
            
            return {
                "success": True,
                "user": {
                    "id": db_user["id"],
                    "firstName": db_user["firstName"],
                    "lastName": db_user["lastName"],
                    "email": db_user["email"],
                    "major": db_user["major"],
                    "graduationYear": db_user["graduationYear"],
                    "currentYear": db_user["currentYear"],
                    "university": db_user["university"],
                    "cognitoSub": db_user["cognitoSub"],
                    "joinedAt": db_user["joinedAt"].isoformat() if db_user["joinedAt"] else None
                }
            }
        except Exception as e:
            print(f"❌ Database error: {e}")
            raise e
            
    except Exception as e:
        print(f"❌ Controller error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user profile: {str(e)}")

@user_router.get("/profile")
async def get_current_user_profile(email: str):
    """Get current user profile (requires email as query parameter)"""
    return await get_user_profile(email) 

@user_router.get("/majors")
async def get_major_options():
    """Get available major options for user selection"""
    try:
        print("📋 Getting major options for user selection")
        
        # Import the major options from user_repository
        from authentication.data_access.user_repository import MAJOR_OPTIONS
        
        return {
            "success": True,
            "majors": MAJOR_OPTIONS
        }
    except Exception as e:
        print(f"❌ Error getting major options: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get major options: {str(e)}") 