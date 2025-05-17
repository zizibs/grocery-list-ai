import React from 'react';

interface Recipe {
  title: string;
  ingredients: string[];
}

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
}

const RecipeModal: React.FC<RecipeModalProps> = ({ isOpen, onClose, recipes }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-4 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Recipes</h2>
        <ul>
          {recipes.map((recipe, index) => (
            <li key={index} className="mb-2">
              <h3 className="font-semibold">{recipe.title}</h3>
              <p>Ingredients: {recipe.ingredients.join(', ')}</p>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Close
        </button>
      </div>
    </div>
  );
};

export default RecipeModal; 