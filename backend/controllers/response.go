package controllers

import (
	"context"
	"strconv"
	"time"

	"form-builder-api/database"
	"form-builder-api/models"
	"form-builder-api/websocket"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ResponseController handles response-related operations
type ResponseController struct {
	responseCollection *mongo.Collection
	formCollection     *mongo.Collection
	hub                *websocket.Hub
}

// NewResponseController creates a new response controller
func NewResponseController(hub *websocket.Hub) *ResponseController {
	return &ResponseController{
		responseCollection: database.GetCollection("responses"),
		formCollection:     database.GetCollection("forms"),
		hub:                hub,
	}
}

// SubmitResponse submits a response to a form
func (rc *ResponseController) SubmitResponse(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	var req models.SubmitResponseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := validate.Struct(req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	// Check if form exists and is published
	var form models.Form
	err = rc.formCollection.FindOne(context.Background(), bson.M{
		"_id":          objectID,
		"is_published": true,
	}).Decode(&form)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{"error": "Form not found or not published"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch form"})
	}

	// Validate response against form fields
	if err := rc.validateResponse(req.Responses, form.Fields); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	// Create response document
	response := models.FormResponse{
		ID:        primitive.NewObjectID(),
		FormID:    objectID,
		Responses: req.Responses,
		Metadata:  req.Metadata,
		IPAddress: c.IP(),
		UserAgent: c.Get("User-Agent"),
		CreatedAt: time.Now(),
	}

	result, err := rc.responseCollection.InsertOne(context.Background(), response)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to submit response"})
	}

	response.ID = result.InsertedID.(primitive.ObjectID)

	// Broadcast new response via WebSocket
	rc.hub.BroadcastToForm(id, "response_submitted", fiber.Map{
		"form_id":  id,
		"response": response,
	})

	// Update analytics asynchronously
	go rc.updateAnalytics(objectID)

	return c.Status(201).JSON(fiber.Map{
		"message":  "Response submitted successfully",
		"response": response,
	})
}

// GetResponses gets all responses for a form
func (rc *ResponseController) GetResponses(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	skip := (page - 1) * limit

	// Get total count
	total, err := rc.responseCollection.CountDocuments(context.Background(), bson.M{"form_id": objectID})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to count responses"})
	}

	// Get responses with pagination
	cursor, err := rc.responseCollection.Find(
		context.Background(),
		bson.M{"form_id": objectID},
		options.Find().
			SetSkip(int64(skip)).
			SetLimit(int64(limit)).
			SetSort(bson.D{{Key: "created_at", Value: -1}}),
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch responses"})
	}
	defer cursor.Close(context.Background())

	var responses []models.FormResponse
	if err := cursor.All(context.Background(), &responses); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to decode responses"})
	}

	if responses == nil {
		responses = []models.FormResponse{}
	}

	return c.JSON(fiber.Map{
		"responses": responses,
		"pagination": fiber.Map{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetAnalytics gets analytics for a form
func (rc *ResponseController) GetAnalytics(c *fiber.Ctx) error {
	id := c.Params("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid form ID"})
	}

	// Get form to access field definitions
	var form models.Form
	err = rc.formCollection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{"error": "Form not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch form"})
	}

	analytics, err := rc.calculateAnalytics(objectID, form.Fields)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to calculate analytics"})
	}

	return c.JSON(analytics.FieldAnalytics)
}

// validateResponse validates a response against form fields
func (rc *ResponseController) validateResponse(responses map[string]interface{}, fields []models.FormField) error {
	for _, field := range fields {
		value, exists := responses[field.ID]

		// Check required fields
		if field.Required && (!exists || value == nil || value == "") {
			return fiber.NewError(400, "Field '"+field.Label+"' is required")
		}

		if !exists || value == nil {
			continue
		}

		// Type-specific validation
		switch field.Type {
		case models.FieldTypeEmail:
			if str, ok := value.(string); ok && str != "" {
				// Basic email validation
				if !isValidEmail(str) {
					return fiber.NewError(400, "Invalid email format for field '"+field.Label+"'")
				}
			}
		case models.FieldTypeNumber:
			if num, ok := value.(float64); ok {
				if field.Validation.Min != 0 && num < field.Validation.Min {
					return fiber.NewError(400, "Value too low for field '"+field.Label+"'")
				}
				if field.Validation.Max != 0 && num > field.Validation.Max {
					return fiber.NewError(400, "Value too high for field '"+field.Label+"'")
				}
			}
		case models.FieldTypeText, models.FieldTypeTextarea:
			if str, ok := value.(string); ok {
				if field.Validation.MinLength > 0 && len(str) < field.Validation.MinLength {
					return fiber.NewError(400, "Text too short for field '"+field.Label+"'")
				}
				if field.Validation.MaxLength > 0 && len(str) > field.Validation.MaxLength {
					return fiber.NewError(400, "Text too long for field '"+field.Label+"'")
				}
			}
		case models.FieldTypeRating:
			if num, ok := value.(float64); ok {
				if num < 1 || num > 5 {
					return fiber.NewError(400, "Rating must be between 1 and 5 for field '"+field.Label+"'")
				}
			}
		}
	}

	return nil
}

// isValidEmail performs basic email validation
func isValidEmail(email string) bool {
	// Basic email validation - in production, use a proper email validation library
	return len(email) > 3 &&
		len(email) < 255 &&
		email[0] != '@' &&
		email[len(email)-1] != '@' &&
		countChar(email, '@') == 1
}

// countChar counts occurrences of a character in a string
func countChar(s string, c rune) int {
	count := 0
	for _, char := range s {
		if char == c {
			count++
		}
	}
	return count
}

// calculateAnalytics calculates comprehensive analytics for a form
func (rc *ResponseController) calculateAnalytics(formID primitive.ObjectID, fields []models.FormField) (*models.FormAnalytics, error) {
	ctx := context.Background()

	// Calculate time ranges
	now := time.Now()
	last24h := now.Add(-24 * time.Hour)
	lastWeek := now.Add(-7 * 24 * time.Hour)
	lastMonth := now.Add(-30 * 24 * time.Hour)

	// Total responses
	total, err := rc.responseCollection.CountDocuments(ctx, bson.M{"form_id": formID})
	if err != nil {
		return nil, err
	}

	// Responses in last 24 hours
	count24h, err := rc.responseCollection.CountDocuments(ctx, bson.M{
		"form_id":    formID,
		"created_at": bson.M{"$gte": last24h},
	})
	if err != nil {
		return nil, err
	}

	// Responses in last week
	countWeek, err := rc.responseCollection.CountDocuments(ctx, bson.M{
		"form_id":    formID,
		"created_at": bson.M{"$gte": lastWeek},
	})
	if err != nil {
		return nil, err
	}

	// Responses in last month
	countMonth, err := rc.responseCollection.CountDocuments(ctx, bson.M{
		"form_id":    formID,
		"created_at": bson.M{"$gte": lastMonth},
	})
	if err != nil {
		return nil, err
	}

	// Calculate response trends (last 7 days)
	responseTrends, err := rc.calculateResponseTrends(formID)
	if err != nil {
		return nil, err
	}

	// Calculate completion rate and average time
	completionRate, avgTime, err := rc.calculateCompletionMetrics(formID, fields)
	if err != nil {
		return nil, err
	}

	// Field-specific analytics with enhanced metrics
	fieldAnalytics := make([]interface{}, 0)

	for _, field := range fields {
		analytics, err := rc.calculateEnhancedFieldAnalytics(formID, field, int(total))
		if err != nil {
			continue // Skip field if error calculating analytics
		}
		fieldAnalytics = append(fieldAnalytics, analytics)
	}

	return &models.FormAnalytics{
		FormID:             formID,
		TotalResponses:     total,
		ResponsesLast24h:   count24h,
		ResponsesLastWeek:  countWeek,
		ResponsesLastMonth: countMonth,
		FieldAnalytics: fiber.Map{
			"total_responses":         total,
			"completion_rate":         completionRate,
			"average_completion_time": avgTime,
			"response_trends":         responseTrends,
			"field_analytics":         fieldAnalytics,
		},
		UpdatedAt: now,
	}, nil
}

// calculateResponseTrends calculates daily response trends for the last 7 days
func (rc *ResponseController) calculateResponseTrends(formID primitive.ObjectID) ([]fiber.Map, error) {
	ctx := context.Background()
	now := time.Now()

	trends := make([]fiber.Map, 0)

	for i := 6; i >= 0; i-- {
		date := now.AddDate(0, 0, -i)
		startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		endOfDay := startOfDay.Add(24 * time.Hour)

		count, err := rc.responseCollection.CountDocuments(ctx, bson.M{
			"form_id": formID,
			"created_at": bson.M{
				"$gte": startOfDay,
				"$lt":  endOfDay,
			},
		})
		if err != nil {
			return nil, err
		}

		trends = append(trends, fiber.Map{
			"date":  startOfDay.Format("2006-01-02"),
			"count": count,
		})
	}

	return trends, nil
}

// calculateCompletionMetrics calculates completion rate and average completion time
func (rc *ResponseController) calculateCompletionMetrics(formID primitive.ObjectID, fields []models.FormField) (float64, float64, error) {
	ctx := context.Background()

	// Get all responses
	cursor, err := rc.responseCollection.Find(ctx, bson.M{"form_id": formID})
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var responses []models.FormResponse
	if err := cursor.All(ctx, &responses); err != nil {
		return 0, 0, err
	}

	if len(responses) == 0 {
		return 0, 0, nil
	}

	requiredFields := make([]string, 0)
	for _, field := range fields {
		if field.Required {
			requiredFields = append(requiredFields, field.ID)
		}
	}

	completedResponses := 0
	totalCompletionTime := float64(0)

	for _, response := range responses {
		// Check if all required fields are completed
		isComplete := true
		for _, fieldID := range requiredFields {
			if value, exists := response.Responses[fieldID]; !exists || value == nil || value == "" {
				isComplete = false
				break
			}
		}

		if isComplete {
			completedResponses++
		}

		// Calculate completion time
		estimatedTime := float64(len(response.Responses)) * 10 // 10 seconds per field
		totalCompletionTime += estimatedTime
	}

	completionRate := float64(completedResponses) / float64(len(responses)) * 100
	avgCompletionTime := totalCompletionTime / float64(len(responses))

	return completionRate, avgCompletionTime, nil
}

// calculateEnhancedFieldAnalytics calculates comprehensive analytics for a specific field
func (rc *ResponseController) calculateEnhancedFieldAnalytics(formID primitive.ObjectID, field models.FormField, totalResponses int) (fiber.Map, error) {
	ctx := context.Background()

	// Count responses for this field (not null/empty)
	fieldResponseCount, err := rc.responseCollection.CountDocuments(ctx, bson.M{
		"form_id":               formID,
		"responses." + field.ID: bson.M{"$exists": true, "$nin": []interface{}{nil, ""}},
	})
	if err != nil {
		return nil, err
	}

	responseRate := float64(0)
	skipRate := float64(100)

	if totalResponses > 0 {
		responseRate = float64(fieldResponseCount) / float64(totalResponses) * 100
		skipRate = 100 - responseRate
	}

	result := fiber.Map{
		"field_id":         field.ID,
		"field_label":      field.Label,
		"field_type":       field.Type,
		"response_rate":    responseRate,
		"skip_rate":        skipRate,
		"unique_responses": 0,
		"common_responses": []fiber.Map{},
	}

	switch field.Type {
	case models.FieldTypeMultipleChoice, models.FieldTypeCheckbox:
		// Get choice distribution
		pipeline := []bson.M{
			{"$match": bson.M{
				"form_id":               formID,
				"responses." + field.ID: bson.M{"$exists": true, "$nin": []interface{}{nil, ""}},
			}},
			{"$project": bson.M{
				"value": "$responses." + field.ID,
			}},
			{"$group": bson.M{
				"_id":   "$value",
				"count": bson.M{"$sum": 1},
			}},
			{"$sort": bson.M{"count": -1}},
			{"$limit": 10},
		}

		cursor, err := rc.responseCollection.Aggregate(ctx, pipeline)
		if err == nil {
			var choiceResults []bson.M
			cursor.All(ctx, &choiceResults)
			cursor.Close(ctx)

			commonResponses := make([]fiber.Map, 0)
			for _, choice := range choiceResults {
				if choice["_id"] != nil {
					percentage := float64(choice["count"].(int32)) / float64(fieldResponseCount) * 100
					commonResponses = append(commonResponses, fiber.Map{
						"value":      choice["_id"],
						"count":      choice["count"],
						"percentage": percentage,
					})
				}
			}
			result["common_responses"] = commonResponses
			result["unique_responses"] = len(choiceResults)
		}

	case models.FieldTypeRating:
		// Calculate average rating and distribution
		pipeline := []bson.M{
			{"$match": bson.M{
				"form_id":               formID,
				"responses." + field.ID: bson.M{"$exists": true, "$nin": []interface{}{nil, ""}},
			}},
			{"$group": bson.M{
				"_id":     nil,
				"average": bson.M{"$avg": "$responses." + field.ID},
				"ratings": bson.M{"$push": "$responses." + field.ID},
			}},
		}

		cursor, err := rc.responseCollection.Aggregate(ctx, pipeline)
		if err == nil {
			var ratingResults []bson.M
			cursor.All(ctx, &ratingResults)
			cursor.Close(ctx)

			if len(ratingResults) > 0 {
				if avg, ok := ratingResults[0]["average"]; ok && avg != nil {
					result["average_rating"] = avg
				}

				// Calculate rating distribution
				if ratings, ok := ratingResults[0]["ratings"].(primitive.A); ok {
					distribution := make(map[int]int)
					for _, rating := range ratings {
						if r, ok := rating.(int32); ok {
							distribution[int(r)]++
						} else if r, ok := rating.(float64); ok {
							distribution[int(r)]++
						}
					}

					commonResponses := make([]fiber.Map, 0)
					for rating := 1; rating <= 5; rating++ {
						count := distribution[rating]
						if count > 0 {
							percentage := float64(count) / float64(len(ratings)) * 100
							commonResponses = append(commonResponses, fiber.Map{
								"value":      rating,
								"count":      count,
								"percentage": percentage,
							})
						}
					}
					result["common_responses"] = commonResponses
				}
			}
		}

	case models.FieldTypeText, models.FieldTypeTextarea, models.FieldTypeEmail:
		// Get most common text responses
		pipeline := []bson.M{
			{"$match": bson.M{
				"form_id":               formID,
				"responses." + field.ID: bson.M{"$exists": true, "$nin": []interface{}{nil, ""}},
			}},
			{"$project": bson.M{
				"value": "$responses." + field.ID,
			}},
			{"$group": bson.M{
				"_id":   "$value",
				"count": bson.M{"$sum": 1},
			}},
			{"$sort": bson.M{"count": -1}},
			{"$limit": 5},
		}

		cursor, err := rc.responseCollection.Aggregate(ctx, pipeline)
		if err == nil {
			var textResults []bson.M
			cursor.All(ctx, &textResults)
			cursor.Close(ctx)

			commonResponses := make([]fiber.Map, 0)
			for _, text := range textResults {
				if text["_id"] != nil {
					percentage := float64(text["count"].(int32)) / float64(fieldResponseCount) * 100
					valueStr := ""
					if str, ok := text["_id"].(string); ok {
						// Truncate long text responses
						if len(str) > 50 {
							valueStr = str[:47] + "..."
						} else {
							valueStr = str
						}
					}
					commonResponses = append(commonResponses, fiber.Map{
						"value":      valueStr,
						"count":      text["count"],
						"percentage": percentage,
					})
				}
			}
			result["common_responses"] = commonResponses
			result["unique_responses"] = len(textResults)
		}
	}

	return result, nil
}

// updateAnalytics updates analytics after a new response (async)
func (rc *ResponseController) updateAnalytics(formID primitive.ObjectID) {
	// This would typically update a cached analytics collection
	// For now, we'll just broadcast an analytics update event
	rc.hub.BroadcastToForm(formID.Hex(), "analytics_updated", fiber.Map{
		"form_id":    formID.Hex(),
		"updated_at": time.Now(),
	})
}
