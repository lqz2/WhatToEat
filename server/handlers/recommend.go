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

	prompt := fmt.Sprintf("你是一位严谨的私厨。现在我的冰箱里【只有】这些食材：%s。我的口味偏好是：%s。请以此为基础推荐 1 到 5 道菜（根据食材丰富程度决定数量）。\n\n要求：\n1. 严格以现有食材为主。如果需要自备关键食材（如鸡蛋、肉类），必须在理由中注明。\n2. 必须以 JSON 数组格式返回，不要包含任何 Markdown 符号或多余文字。\n\nJSON 格式示例：\n[{\"name\": \"菜名\", \"reason\": \"理由\", \"steps\": \"做法\"}]",
		strings.Join(ingredients, "、"),
		strings.Join(tastes, "、"))

	// 4. 调用 OpenRouter
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "未配置 LLM API Key"})
		return
	}

	modelName := os.Getenv("LLM_MODEL")
	if modelName == "" {
		modelName = "google/gemini-flash-1.5-exp:free"
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
	req.Header.Set("Content-Type", "application/json")

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
	if err := json.Unmarshal(body, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析 LLM 响应失败", "raw": string(body)})
		return
	}

	choices, ok := result["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LLM 未返回有效结果", "details": result})
		return
	}

	firstChoice, ok := choices[0].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LLM 响应格式异常"})
		return
	}
	message, ok := firstChoice["message"].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "LLM 消息体异常"})
		return
	}
	content, _ := message["content"].(string)

	// 尝试解析内层 JSON 数组
	var recommendations []map[string]string
	err = json.Unmarshal([]byte(content), &recommendations)
	if err != nil {
		// 如果 LLM 返回的不是纯 JSON，尝试清理一下（有时候模型会带 ```json）
		cleanContent := strings.TrimSpace(content)
		cleanContent = strings.TrimPrefix(cleanContent, "```json")
		cleanContent = strings.TrimSuffix(cleanContent, "```")
		cleanContent = strings.TrimSpace(cleanContent)
		err = json.Unmarshal([]byte(cleanContent), &recommendations)
	}

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"type": "text",
			"data": content,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"type": "list",
		"data": recommendations,
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

// Trigger redeploy
