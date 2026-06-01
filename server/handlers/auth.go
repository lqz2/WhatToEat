package handlers

import (
	"crypto/rand"
	"fmt"
	"net/http"
	"os"
	"time"

	"whattoeat/database"
	"whattoeat/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// generateUUID 生成一个符合 RFC 4122 v4 的轻量 UUID
func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// generateLocalToken 签发本地 JWT Token
func generateLocalToken(userID string, email string) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = os.Getenv("SUPABASE_JWT_SECRET")
	}
	if jwtSecret == "" {
		jwtSecret = "whattoeat_default_jwt_secret_key_2026"
	}

	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"exp":   time.Now().Add(time.Hour * 24 * 30).Unix(), // 30天过期时间
		"iat":   time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

// Register 本地用户注册
func Register(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	db := database.GetDB()

	// 检查邮箱是否已被注册
	var existing models.User
	if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "该邮箱已被注册"})
		return
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	// 创建用户
	userID := generateUUID()
	user := models.User{
		ID:       userID,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户创建失败"})
		return
	}

	// 注册成功后自动签发 Token 进行登录
	token, err := generateLocalToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token 签发失败"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  token,
		RefreshToken: "local-refresh-token",
		UserID:       user.ID,
		Email:        user.Email,
	})
}

// Login 本地用户登录
func Login(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	db := database.GetDB()

	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在或密码错误"})
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在或密码错误"})
		return
	}

	// 签发 Token
	token, err := generateLocalToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token 签发失败"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  token,
		RefreshToken: "local-refresh-token",
		UserID:       user.ID,
		Email:        user.Email,
	})
}
