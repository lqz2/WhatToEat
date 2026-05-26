package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"whattoeat/models"

	"github.com/gin-gonic/gin"
)

// supabaseAuthRequest Supabase Auth API 请求体
type supabaseAuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// supabaseAuthResponse Supabase Auth API 响应体
type supabaseAuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
}

// supabaseError Supabase 错误响应
type supabaseError struct {
	Msg         string `json:"msg"`
	Error       string `json:"error"`
	Description string `json:"error_description"`
}

// Register 用户注册
func Register(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	// 调用 Supabase Auth API 注册
	body := supabaseAuthRequest{
		Email:    req.Email,
		Password: req.Password,
	}
	jsonBody, _ := json.Marshal(body)

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	httpReq, err := http.NewRequest("POST", supabaseURL+"/auth/v1/signup", bytes.NewBuffer(jsonBody))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建请求失败"})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("apikey", supabaseKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "请求 Supabase 失败"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		var supErr supabaseError
		json.Unmarshal(respBody, &supErr)
		errMsg := supErr.Msg
		if errMsg == "" {
			errMsg = supErr.Error
		}
		if errMsg == "" {
			errMsg = supErr.Description
		}
		c.JSON(resp.StatusCode, gin.H{"error": errMsg})
		return
	}

	var authResp supabaseAuthResponse
	if err := json.Unmarshal(respBody, &authResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析响应失败"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  authResp.AccessToken,
		RefreshToken: authResp.RefreshToken,
		UserID:       authResp.User.ID,
		Email:        authResp.User.Email,
	})
}

// Login 用户登录
func Login(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	// 调用 Supabase Auth API 登录
	body := supabaseAuthRequest{
		Email:    req.Email,
		Password: req.Password,
	}
	jsonBody, _ := json.Marshal(body)

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	httpReq, err := http.NewRequest("POST", supabaseURL+"/auth/v1/token?grant_type=password", bytes.NewBuffer(jsonBody))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建请求失败"})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("apikey", supabaseKey)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "请求 Supabase 失败"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		var supErr supabaseError
		json.Unmarshal(respBody, &supErr)
		errMsg := supErr.Msg
		if errMsg == "" {
			errMsg = supErr.Error
		}
		if errMsg == "" {
			errMsg = supErr.Description
		}
		c.JSON(resp.StatusCode, gin.H{"error": errMsg})
		return
	}

	var authResp supabaseAuthResponse
	if err := json.Unmarshal(respBody, &authResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析响应失败"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  authResp.AccessToken,
		RefreshToken: authResp.RefreshToken,
		UserID:       authResp.User.ID,
		Email:        authResp.User.Email,
	})
}
