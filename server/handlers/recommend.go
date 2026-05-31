package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"whattoeat/database"
	"whattoeat/middleware"
	"whattoeat/models"

	"github.com/gin-gonic/gin"
)

// OpenRouterRequest OpenRouter 请求结构
type OpenRouterRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// GetRecommendations 调用 OpenRouter 推荐菜品
func GetRecommendations(c *gin.Context) {
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	// 1. 获取冰箱食材
	var items []models.FridgeItem
	db.Where("user_id = ? OR user_id IN (SELECT owner_id FROM shared_menus WHERE shared_with_id = ?)", userID, userID).Find(&items)

	if len(items) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"recommendations": "你的冰箱空空如也，先去添加一些食材吧！",
		})
		return
	}

	// 2. 获取用户偏好
	var prefs []models.UserPreference
	db.Where("user_id = ?", userID).Find(&prefs)

	// 3. 构建 Prompt
	var ingredients []string
	for _, item := range items {
		ingredients = append(ingredients, item.Name)
	}

	var tastes []string
	for _, p := range prefs {
		tastes = append(tastes, p.Cuisine)
	}

	prompt := fmt.Sprintf("我的冰箱里有这些食材：%s。我平时喜欢吃：%s。请结合这些信息，为我推荐 3 道菜，并给出菜名、推荐理由（结合我的食材）以及非常简短的做法提示。请直接返回中文，不要带 Markdown 格式符号。", 
		strings.Join(ingredients, "、"), 
		strings.Join(tastes, "、"))

	// 4. 调用 OpenRouter
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "未配置 LLM API Key (OPENROUTER_API_KEY)"})
		return
	}

	reqBody := OpenRouterRequest{
		Model: "google/gemini-flash-1.5-exp:free", // OpenRouter 上的免费模型
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
	}

	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "json")
	req.Header.Set("HTTP-Referer", "https://whattoeat.com")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "连接 LLM 失败"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	
	// 解析响应
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if errData, ok := result["error"]; ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LLM 报错", "details": errData})
		return
	}

	choices := result["choices"].([]interface{})
	if len(choices) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LLM 未返回结果"})
		return
	}
	
	firstChoice := choices[0].(map[string]interface{})
	message := firstChoice["message"].(map[string]interface{})
	content := message["content"].(string)

	c.JSON(http.StatusOK, gin.H{
		"recommendations": content,
	})
}

// GetPreferences 获取用户偏好
func GetPreferences(c *gin.Context) {
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	var preferences []models.UserPreference
	db.Where("user_id = ?", userID).Order("weight DESC").Find(&preferences)

	c.JSON(http.StatusOK, preferences)
}

// CreatePreference 设置菜系偏好
func CreatePreference(c *gin.Context) {
	var pref models.UserPreference
	if err := c.ShouldBindJSON(&pref); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	pref.UserID = userID

	db := database.GetDB()
	// 如果已存在则更新，不存在则创建
	var existing models.UserPreference
	if err := db.Where("user_id = ? AND cuisine = ?", userID, pref.Cuisine).First(&existing).Error; err == nil {
		existing.Weight = pref.Weight
		db.Save(&existing)
	} else {
		db.Create(&pref)
	}

	c.JSON(http.StatusOK, pref)
}

// DeletePreference 删除偏好
func DeletePreference(c *gin.Context) {
	cuisine := c.Param("cuisine")
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	db.Where("user_id = ? AND cuisine = ?", userID, cuisine).Delete(&models.UserPreference{})
	c.JSON(http.StatusOK, gin.H{"message": "已删除偏好"})
}


	c.JSON(http.StatusCreated, pref)
}

// DeletePreference 删除菜系偏好
func DeletePreference(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cuisine := c.Param("cuisine")
	if cuisine == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请指定要删除的菜系"})
		return
	}

	db := database.GetDB()
	result := db.Where("user_id = ? AND cuisine = ?", userID, cuisine).Delete(&models.UserPreference{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "偏好不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
