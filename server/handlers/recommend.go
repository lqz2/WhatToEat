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

	prompt := fmt.Sprintf("你是一位严谨的私厨。现在我的冰箱里【只有】这些食材：%s。我的口味偏好是：%s。请以此为基础推荐 3 道菜。要求：1. 严格以现有食材为主，除了食盐、油、酱油等基础调料外，如果需要额外添加我冰箱里没有的食材（如鸡蛋、豆腐、肉类等），必须在‘推荐理由’中明确标注‘（注意：需自备XX）’。2. 如果食材实在无法做菜，请推荐最接近的吃法或建议。3. 直接返回结果，不要 Markdown 格式，不要有‘好的’等废话。格式：菜名：xxx\n推荐理由：xxx\n做法提示：xxx。",
		strings.Join(ingredients, "、"),
		strings.Join(tastes, "、"))

	// 4. 调用 OpenRouter
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "未配置 LLM API Key (OPENROUTER_API_KEY)"})
		return
	}

	modelName := os.Getenv("LLM_MODEL")
	if modelName == "" {
		modelName = "openrouter/free" // 默认模型
	}

	reqBody := OpenRouterRequest{
		Model: modelName,
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
