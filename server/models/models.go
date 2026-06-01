package models

import (
	"time"
)

// User 本地用户模型
type User struct {
	ID        string    `json:"id" gorm:"type:text;primaryKey"`
	Email     string    `json:"email" gorm:"size:100;uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"size:255;not null"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (User) TableName() string {
	return "users"
}

// FridgeItem 冰箱食材模型
type FridgeItem struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"type:text;not null"`
	Name      string    `json:"name" gorm:"size:100;not null"`
	Quantity  string    `json:"quantity" gorm:"size:50"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (FridgeItem) TableName() string {
	return "fridge_items"
}

// UserPreference 用户菜系和口味偏好模型
type UserPreference struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"type:text;not null"`
	Cuisine   string    `json:"cuisine" gorm:"size:50;not null"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (UserPreference) TableName() string {
	return "user_preferences"
}

// SharedMenu 菜单共享模型
type SharedMenu struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	OwnerID      string    `json:"owner_id" gorm:"type:text;not null"`
	SharedWithID string    `json:"shared_with_id" gorm:"type:text;not null"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (SharedMenu) TableName() string {
	return "shared_menus"
}

// CreatePreferenceRequest 创建偏好请求
type CreatePreferenceRequest struct {
	Cuisine string `json:"cuisine" binding:"required"`
}

// ShareRequest 共享请求
type ShareRequest struct {
	SharedWithEmail string `json:"shared_with_email" binding:"required"`
}

// AuthRequest 认证请求
type AuthRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// AuthResponse 认证响应
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
}
