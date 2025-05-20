/**
 * Fallback recipe generator when OpenAI API is unavailable
 */

// Sample recipes for common ingredients
const RECIPES = [
  {
    title: "Simple Pasta Dish",
    ingredients: ["pasta", "tomato", "garlic", "onion", "olive oil", "cheese"],
    instructions: "1. Cook pasta according to package directions.\n2. Sauté minced garlic and diced onion in olive oil.\n3. Add diced tomatoes and cook for 5-7 minutes.\n4. Mix with pasta and top with cheese."
  },
  {
    title: "Basic Stir Fry",
    ingredients: ["rice", "vegetables", "oil", "soy sauce", "garlic", "ginger"],
    instructions: "1. Cook rice according to package directions.\n2. Heat oil in a pan and add minced garlic and ginger.\n3. Add chopped vegetables and stir-fry until tender-crisp.\n4. Season with soy sauce and serve over rice."
  },
  {
    title: "Simple Salad",
    ingredients: ["lettuce", "tomato", "cucumber", "oil", "vinegar", "salt", "pepper"],
    instructions: "1. Wash and chop lettuce, tomato, and cucumber.\n2. Mix in a bowl.\n3. Dress with oil, vinegar, salt and pepper to taste."
  },
  {
    title: "Easy Soup",
    ingredients: ["potato", "onion", "carrot", "stock", "salt", "pepper"],
    instructions: "1. Dice potato, onion, and carrot.\n2. Simmer in stock for 20-25 minutes until vegetables are tender.\n3. Season with salt and pepper."
  },
  {
    title: "Quick Sandwich",
    ingredients: ["bread", "cheese", "ham", "lettuce", "tomato", "mayo", "mustard"],
    instructions: "1. Spread mayo and mustard on bread slices.\n2. Layer ham, cheese, lettuce, and tomato.\n3. Top with second bread slice and enjoy."
  }
];

/**
 * Find matching recipes based on available ingredients
 */
export function findMatchingRecipes(availableIngredients: string[]): {
  title: string;
  ingredients: string[];
  instructions: string;
  matchedIngredients: string[];
}[] {
  const normalizedIngredients = availableIngredients.map(i => 
    i.toLowerCase().trim()
  );
  
  // Score recipes based on ingredient matches
  const scoredRecipes = RECIPES.map(recipe => {
    const matchedIngredients = recipe.ingredients.filter(
      ingredient => normalizedIngredients.some(
        available => available.includes(ingredient) || ingredient.includes(available)
      )
    );
    
    return {
      ...recipe,
      score: matchedIngredients.length / recipe.ingredients.length,
      matchedIngredients
    };
  });
  
  // Sort by score (most matched ingredients first)
  return scoredRecipes
    .filter(recipe => recipe.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Generate a recipe suggestion based on available ingredients
 */
export function generateRecipeSuggestion(availableIngredients: string[]): string {
  if (!availableIngredients || availableIngredients.length === 0) {
    return "I need some ingredients to suggest recipes. Please add some items to your purchased list.";
  }
  
  const matchingRecipes = findMatchingRecipes(availableIngredients);
  
  if (matchingRecipes.length === 0) {
    return `I don't have any specific recipes that match your ingredients: ${availableIngredients.join(', ')}. Try adding more common ingredients to your list.`;
  }
  
  // Take top recipe
  const bestMatch = matchingRecipes[0];
  
  return `
# ${bestMatch.title}

## Matched Ingredients:
${bestMatch.matchedIngredients.join(', ')}

## All Ingredients Needed:
${bestMatch.ingredients.join(', ')}

## Instructions:
${bestMatch.instructions}

Would you like me to suggest another recipe with your ingredients?
`;
}

/**
 * Generate a follow-up response
 */
export function generateFollowupResponse(query: string, availableIngredients: string[]): string {
  // Simple keyword matching for common follow-up questions
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('another') || lowerQuery.includes('different') || lowerQuery.includes('else')) {
    // User wants another recipe
    const matchingRecipes = findMatchingRecipes(availableIngredients);
    
    if (matchingRecipes.length <= 1) {
      return "I'm sorry, I don't have any other recipes that match your ingredients well. Try adding more ingredients to your list.";
    }
    
    // Get the second best match
    const altRecipe = matchingRecipes[1];
    
    return `
# ${altRecipe.title}

## Matched Ingredients:
${altRecipe.matchedIngredients.join(', ')}

## All Ingredients Needed:
${altRecipe.ingredients.join(', ')}

## Instructions:
${altRecipe.instructions}
`;
  }
  
  if (lowerQuery.includes('substitute') || lowerQuery.includes('replace') || lowerQuery.includes('instead of')) {
    return "For substitutions, you can usually replace similar ingredients. For example, you can substitute any leafy green for another, or different types of cheese or proteins.";
  }
  
  if (lowerQuery.includes('how long') || lowerQuery.includes('time')) {
    return "Most simple recipes take about 20-30 minutes to prepare. Follow the specific timing instructions in the recipe for best results.";
  }
  
  // Default response
  return "I'm a simple fallback recipe assistant. I can suggest basic recipes based on ingredients or give general cooking advice. What would you like to know?";
} 