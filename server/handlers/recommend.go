package handlers

import (
	"math/rand"
	"net/http"

	"whattoeat/database"
	"whattoeat/middleware"
	"whattoeat/models"

	"github.com/gin-gonic/gin"
)

// GetRecommendations 根据偏好推荐菜品
func GetRecommendations(c *gin.Context) {
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	// 获取用户偏好
	var preferences []models.UserPreference
	db.Where("user_id = ?", userID).Find(&preferences)

	// 如果没有偏好设置，随机返回用户自己的菜品
	if len(preferences) == 0 {
		dishes := make([]models.Dish, 0)
		db.Where("user_id = ?", userID).
			Order("RANDOM()").
			Limit(10).
			Find(&dishes)
		c.JSON(http.StatusOK, dishes)
		return
	}

	// 根据偏好权重加权随机选取菜品
	allRecommended := make([]models.Dish, 0)
	seen := make(map[uint]bool)

	for _, pref := range preferences {
		var dishes []models.Dish
		// 根据权重决定每个菜系推荐的菜品数量
		count := pref.Weight * 2
		if count < 1 {
			count = 1
		}

		db.Where("user_id = ? AND cuisine = ?", userID, pref.Cuisine).
			Order("RANDOM()").
			Limit(count).
			Find(&dishes)

		for _, dish := range dishes {
			if !seen[dish.ID] {
				seen[dish.ID] = true
				allRecommended = append(allRecommended, dish)
			}
		}
	}

	// 如果推荐菜品不足，补充随机菜品
	if len(allRecommended) < 10 {
		var extraDishes []models.Dish
		db.Where("user_id = ?", userID).
			Order("RANDOM()").
			Limit(10 - len(allRecommended)).
			Find(&extraDishes)

		for _, dish := range extraDishes {
			if !seen[dish.ID] {
				seen[dish.ID] = true
				allRecommended = append(allRecommended, dish)
			}
		}
	}

	// 打乱推荐结果顺序
	rand.Shuffle(len(allRecommended), func(i, j int) {
		allRecommended[i], allRecommended[j] = allRecommended[j], allRecommended[i]
	})

	// 最多返回 10 条
	if len(allRecommended) > 10 {
		allRecommended = allRecommended[:10]
	}

	c.JSON(http.StatusOK, allRecommended)
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
	userID := middleware.GetUserID(c)

	var req models.CreatePreferenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	weight := req.Weight
	if weight < 1 {
		weight = 1
	}

	db := database.GetDB()

	// 检查是否已存在该菜系偏好
	var existing models.UserPreference
	result := db.Where("user_id = ? AND cuisine = ?", userID, req.Cuisine).First(&existing)
	if result.Error == nil {
		// 已存在，更新权重
		db.Model(&existing).Update("weight", weight)
		existing.Weight = weight
		c.JSON(http.StatusOK, existing)
		return
	}

	// 新建偏好
	pref := models.UserPreference{
		UserID:  userID,
		Cuisine: req.Cuisine,
		Weight:  weight,
	}

	if result := db.Create(&pref); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建偏好失败"})
		return
	}

	c.JSON(http.StatusCreated, pref)
}

// DeletePreference 删除菜系偏好
func DeletePreference(c *gin.Context) {
	userID := middleware.GetUserID(c)

	cuisine := c.Query("cuisine")
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
