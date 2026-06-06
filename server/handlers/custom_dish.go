package handlers

import (
	"net/http"

	"whattoeat/database"
	"whattoeat/middleware"
	"whattoeat/models"

	"github.com/gin-gonic/gin"
)

// GetCustomDishes 获取当前用户的所有自定义菜品
func GetCustomDishes(c *gin.Context) {
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	var dishes []models.CustomDish
	db.Where("user_id = ?", userID).Order("created_at DESC").Find(&dishes)

	c.JSON(http.StatusOK, dishes)
}

// AddCustomDish 添加自定义菜品
func AddCustomDish(c *gin.Context) {
	var req models.CreateCustomDishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效: " + err.Error()})
		return
	}

	userID := middleware.GetUserID(c)

	dish := models.CustomDish{
		UserID:      userID,
		Name:        req.Name,
		Ingredients: req.Ingredients,
		Tag:         req.Tag,
	}

	db := database.GetDB()
	if err := db.Create(&dish).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加菜品失败"})
		return
	}

	c.JSON(http.StatusOK, dish)
}

// DeleteCustomDish 删除自定义菜品
func DeleteCustomDish(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetUserID(c)
	db := database.GetDB()

	result := db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.CustomDish{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权操作或菜品不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
