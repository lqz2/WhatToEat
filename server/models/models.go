package models

import (
	"time"

	"github.com/lib/pq"
)

// Dish 菜品模型
type Dish struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      string         `json:"user_id" gorm:"type:uuid;not null"`
	Name        string         `json:"name" gorm:"size:100;not null"`
	Cuisine     string         `json:"cuisine" gorm:"size:50;not null"`
	Description string         `json:"description" gorm:"type:text"`
	Tags        pq.StringArray `json:"tags" gorm:"type:text[]"`
	ImageURL    string         `json:"image_url" gorm:"type:text"`
	IsFavorite  bool           `json:"is_favorite" gorm:"default:false"`
	CreatedAt   time.Time      `json:"created_at" gorm:"autoCreateTime"`
}

func (Dish) TableName() string {
	return "dishes"
}

// UserPreference 用户菜系偏好模型
type UserPreference struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"type:uuid;not null"`
	Cuisine   string    `json:"cuisine" gorm:"size:50;not null"`
	Weight    int       `json:"weight" gorm:"default:1"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (UserPreference) TableName() string {
	return "user_preferences"
}

// SharedMenu 菜单共享模型
type SharedMenu struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	OwnerID      string    `json:"owner_id" gorm:"type:uuid;not null"`
	SharedWithID string    `json:"shared_with_id" gorm:"type:uuid;not null"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (SharedMenu) TableName() string {
	return "shared_menus"
}

// CreateDishRequest 创建菜品请求
type CreateDishRequest struct {
	Name        string   `json:"name" binding:"required"`
	Cuisine     string   `json:"cuisine" binding:"required"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	ImageURL    string   `json:"image_url"`
}

// UpdateDishRequest 更新菜品请求
type UpdateDishRequest struct {
	Name        string   `json:"name"`
	Cuisine     string   `json:"cuisine"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	ImageURL    string   `json:"image_url"`
}

// CreatePreferenceRequest 创建偏好请求
type CreatePreferenceRequest struct {
	Cuisine string `json:"cuisine" binding:"required"`
	Weight  int    `json:"weight"`
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
