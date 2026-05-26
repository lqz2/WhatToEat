package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"

	"whattoeat/database"
	"whattoeat/middleware"
	"whattoeat/models"

	"github.com/gin-gonic/gin"
)

// SharedUserResponse 共享用户响应
type SharedUserResponse struct {
	ID           uint   `json:"id"`
	SharedWithID string `json:"shared_with_id"`
	Email        string `json:"email"`
	CreatedAt    string `json:"created_at"`
}

// ShareMenu 共享菜单给指定用户（通过邮箱）
func ShareMenu(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req models.ShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	// 通过 Supabase Admin API 根据邮箱查找用户 ID
	targetUserID, email, err := lookupUserByEmail(req.SharedWithEmail)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到该邮箱对应的用户"})
		return
	}

	if targetUserID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不能共享给自己"})
		return
	}

	db := database.GetDB()

	// 检查是否已经共享过
	var existing models.SharedMenu
	if db.Where("owner_id = ? AND shared_with_id = ?", userID, targetUserID).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "已经共享给该用户"})
		return
	}

	share := models.SharedMenu{
		OwnerID:      userID,
		SharedWithID: targetUserID,
	}

	if result := db.Create(&share); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "共享失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":             share.ID,
		"shared_with_id": targetUserID,
		"email":          email,
		"created_at":     share.CreatedAt,
	})
}

// CancelShare 取消共享
func CancelShare(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的共享 ID"})
		return
	}

	db := database.GetDB()
	result := db.Where("id = ? AND owner_id = ?", id, userID).Delete(&models.SharedMenu{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取消共享失败"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "共享记录不存在或无权操作"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "取消共享成功"})
}

// GetSharedList 查看共享列表
func GetSharedList(c *gin.Context) {
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	shares := make([]models.SharedMenu, 0)
	db.Where("owner_id = ? OR shared_with_id = ?", userID, userID).Find(&shares)

	// 获取相关用户的邮箱信息
	type ShareInfo struct {
		ID           uint   `json:"id"`
		OwnerID      string `json:"owner_id"`
		SharedWithID string `json:"shared_with_id"`
		Email        string `json:"email"`
		IsOwner      bool   `json:"is_owner"`
		CreatedAt    string `json:"created_at"`
	}

	result := make([]ShareInfo, 0)
	emailCache := make(map[string]string)

	for _, share := range shares {
		targetID := share.SharedWithID
		if share.SharedWithID == userID {
			targetID = share.OwnerID
		}

		email, ok := emailCache[targetID]
		if !ok {
			email, _ = getUserEmailByID(targetID)
			emailCache[targetID] = email
		}

		result = append(result, ShareInfo{
			ID:           share.ID,
			OwnerID:      share.OwnerID,
			SharedWithID: share.SharedWithID,
			Email:        email,
			IsOwner:      share.OwnerID == userID,
			CreatedAt:    share.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, result)
}

// lookupUserByEmail 通过 Supabase Admin API 根据邮箱查找用户
func lookupUserByEmail(email string) (string, string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	req, err := http.NewRequest("GET", supabaseURL+"/auth/v1/admin/users?filter="+email, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Users []struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"users"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", err
	}

	for _, user := range result.Users {
		if user.Email == email {
			return user.ID, user.Email, nil
		}
	}

	return "", "", nil
}

// getUserEmailByID 通过 Supabase Admin API 根据用户 ID 获取邮箱
func getUserEmailByID(userID string) (string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	req, err := http.NewRequest("GET", supabaseURL+"/auth/v1/admin/users/"+userID, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Email string `json:"email"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Email, nil
}
