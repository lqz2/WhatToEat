package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware JWT 认证中间件，验证 Supabase 签发的 Token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少 Authorization 请求头"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的 Authorization 格式"})
			c.Abort()
			return
		}

		// 优先使用本地 JWT Secret 验证（Supabase JWT Secret）
		jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
		if jwtSecret != "" {
			userID, err := verifyJWT(tokenString, jwtSecret)
			if err == nil {
				c.Set("user_id", userID)
				c.Next()
				return
			}
		}

		// 降级：通过 Supabase Auth API 验证 Token
		userID, err := verifyWithSupabase(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的 Token"})
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}

// verifyJWT 使用 JWT Secret 验证 Token 并提取 user_id
func verifyJWT(tokenString, secret string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		sub, ok := claims["sub"].(string)
		if !ok {
			return "", fmt.Errorf("missing sub claim")
		}
		return sub, nil
	}

	return "", fmt.Errorf("invalid token")
}

// verifyWithSupabase 通过 Supabase Auth API 验证 Token
func verifyWithSupabase(tokenString string) (string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return "", fmt.Errorf("supabase config missing")
	}

	req, err := http.NewRequest("GET", supabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+tokenString)
	req.Header.Set("apikey", supabaseKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("invalid token")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.ID, nil
}

// GetUserID 从 Gin Context 中获取当前用户 ID
func GetUserID(c *gin.Context) string {
	userID, exists := c.Get("user_id")
	if !exists {
		return ""
	}
	return userID.(string)
}
