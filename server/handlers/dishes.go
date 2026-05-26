package handlers

import (
	"net/http"
	"strconv"

	"whattoeat/database"
	"whattoeat/middleware"
	"whattoeat/models"

	"github.com/gin-gonic/gin"
)

// GetDishes 获取菜品列表（自己的 + 被共享的）
func GetDishes(c *gin.Context) {
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	dishes := make([]models.Dish, 0)

	// 查询自己的菜品
	result := db.Where("user_id = ?", userID).Order("created_at DESC").Find(&dishes)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询菜品失败"})
		return
	}

	// 查询被共享给自己的菜品（通过子查询获取共享者的 user_id）
	var sharedDishes []models.Dish
	db.Where("user_id IN (?)",
		db.Model(&models.SharedMenu{}).
			Select("owner_id").
			Where("shared_with_id = ?", userID),
	).Order("created_at DESC").Find(&sharedDishes)

	// 合并结果
	dishes = append(dishes, sharedDishes...)

	c.JSON(http.StatusOK, dishes)
}

// CreateDish 创建菜品
func CreateDish(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req models.CreateDishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	dish := models.Dish{
		UserID:      userID,
		Name:        req.Name,
		Cuisine:     req.Cuisine,
		Description: req.Description,
		Tags:        req.Tags,
		ImageURL:    req.ImageURL,
	}

	db := database.GetDB()
	if result := db.Create(&dish); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建菜品失败"})
		return
	}

	c.JSON(http.StatusCreated, dish)
}

// UpdateDish 更新菜品
func UpdateDish(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的菜品 ID"})
		return
	}

	var req models.UpdateDishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}

	db := database.GetDB()
	var dish models.Dish

	// 查找菜品并验证所有权
	if result := db.Where("id = ? AND user_id = ?", id, userID).First(&dish); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "菜品不存在或无权修改"})
		return
	}

	// 更新字段
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Cuisine != "" {
		updates["cuisine"] = req.Cuisine
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Tags != nil {
		updates["tags"] = req.Tags
	}
	if req.ImageURL != "" {
		updates["image_url"] = req.ImageURL
	}

	if len(updates) > 0 {
		db.Model(&dish).Updates(updates)
	}

	db.First(&dish, id)
	c.JSON(http.StatusOK, dish)
}

// DeleteDish 删除菜品
func DeleteDish(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的菜品 ID"})
		return
	}

	db := database.GetDB()

	// 验证所有权并删除
	result := db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Dish{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除菜品失败"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "菜品不存在或无权删除"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// ToggleFavorite 收藏/取消收藏菜品
func ToggleFavorite(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的菜品 ID"})
		return
	}

	db := database.GetDB()
	var dish models.Dish

	if result := db.Where("id = ? AND user_id = ?", id, userID).First(&dish); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "菜品不存在或无权操作"})
		return
	}

	// 切换收藏状态
	db.Model(&dish).Update("is_favorite", !dish.IsFavorite)
	dish.IsFavorite = !dish.IsFavorite

	c.JSON(http.StatusOK, dish)
}
