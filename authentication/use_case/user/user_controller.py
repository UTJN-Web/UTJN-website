# authentication/use_case/user/user_controller.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from authentication.data_access.data_access import get_user_sub
from authentication.data_access.user_repository import UserRepository

user_router = APIRouter(prefix="/users", tags=["users"])

class UserProfileRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    major: str
    graduationYear: int
    university: str

class UserProfileResponse(BaseModel):
    id: int
    firstName: str
    lastName: str
    email: str
    major: str
    graduationYear: int
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
        
        # Initialize user repository
        user_repo = UserRepository()
        await user_repo.connect()
        
        try:
            # Check if user already exists
            existing_user = await user_repo.get_user_by_email(user_data.email)
            if existing_user:
                await user_repo.disconnect()
                raise HTTPException(status_code=400, detail="User profile already exists")
            
            # Create user in database
            db_user = await user_repo.create_user({
                "firstName": user_data.firstName,
                "lastName": user_data.lastName,
                "email": user_data.email,
                "major": user_data.major,
                "graduationYear": user_data.graduationYear,
                "cognitoSub": cognito_sub,
            })
            
            await user_repo.disconnect()
            
            return {
                "success": True,
                "message": "User profile created successfully",
                "user": {
                    "id": db_user["id"],
                    "firstName": db_user["firstName"],
                    "lastName": db_user["lastName"],
                    "email": db_user["email"],
                    "major": db_user["major"],
                    "graduationYear": db_user["graduationYear"],
                    "university": user_data.university,
                    "cognitoSub": db_user["cognitoSub"]
                }
            }
        except Exception as e:
            await user_repo.disconnect()
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user profile: {str(e)}")

@user_router.get("/profile/{email}")
async def get_user_profile(email: str):
    """Get user profile by email"""
    try:
        # Initialize user repository
        user_repo = UserRepository()
        await user_repo.connect()
        
        try:
            # Get user from database
            db_user = await user_repo.get_user_by_email(email)
            if not db_user:
                await user_repo.disconnect()
                raise HTTPException(status_code=404, detail="User profile not found")
            
            await user_repo.disconnect()
            
            return {
                "success": True,
                "user": {
                    "id": db_user["id"],
                    "firstName": db_user["firstName"],
                    "lastName": db_user["lastName"],
                    "email": db_user["email"],
                    "major": db_user["major"],
                    "graduationYear": db_user["graduationYear"],
                    "cognitoSub": db_user["cognitoSub"],
                    "joinedAt": db_user["joinedAt"].isoformat() if db_user["joinedAt"] else None
                }
            }
        except Exception as e:
            await user_repo.disconnect()
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user profile: {str(e)}")

@user_router.get("/profile")
async def get_current_user_profile(email: str):
    """Get current user profile (requires email as query parameter)"""
    return await get_user_profile(email) 