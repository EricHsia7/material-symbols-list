import clip, torch
from PIL import Image
import json
import time
import os

def get_class_descriptions():
  result = set()
  with open("./tmp/versions.json", "r", encoding="utf-8") as file:
    data = json.load(file)
    for symbol_name in data:
      # full phrase -> exact semantic meaning
      phrase = symbol_name.replace("_", " ")
      result.add(phrase)
      # split words -> broad tag matching
      words = symbol_name.split("_")
      for word in words:
        if len(word) > 1:
          result.add(word)
  return list(result)

device = "cpu"
model, preprocess = clip.load("ViT-B/16", device=device)

class_descriptions = get_class_descriptions()

# Prompt ensembling: Providing context helps CLIP understand it's looking at graphical symbols
templates = [
    "a black and white icon of [{}]",
    "a material design symbol representing [{}]",
    "a minimalist illustration of [{}]"
]

def encode_with_templates(descriptions):
  print("Encoding text features with prompt ensembling...")
  with torch.no_grad():
    all_features = []
    for desc in descriptions:
      # Create multiple prompt variations for a single word/phrase
      texts = [template.format(desc) for template in templates]
      text_inputs = torch.cat([clip.tokenize(t) for t in texts]).to(device)
      features = model.encode_text(text_inputs)
      
      # Average the features across the templates to get a robust vector
      features = features.mean(dim=0, keepdim=True)
      features = features / features.norm(dim=-1, keepdim=True)
      all_features.append(features)
  return torch.cat(all_features)

text_features = encode_with_templates(class_descriptions)

def tag_image(file_path):
  start = time.time()
  image_tensor = preprocess(Image.open(file_path)).unsqueeze(0).to(device)
  with torch.no_grad():
    image_features = model.encode_image(image_tensor)
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)

    similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)
    values, indices = similarities[0].topk(16)

    result = [class_descriptions[idx] for idx in indices]

    end = time.time()
    print(f"Successfully tagged {file_path} in {end - start:.2f}s")
    return result

def main(input_dir="./tmp/rasterized", output_dir="./tags", prompts_dir="./tmp/prompts"):
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(prompts_dir, exist_ok=True)

    # Iterate through all PNG files
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(".png"):
            file_path = os.path.join(input_dir, filename)

            # Process image
            result_list = tag_image(file_path)

            # Construct output filename
            base_name = os.path.splitext(filename)[0]
            output_file = os.path.join(output_dir, f"{base_name}.txt")
            prompt_file = os.path.join(prompts_dir, f"{base_name}.txt")

            # Save results to file
            with open(output_file, "w", encoding="utf-8") as f:
                for item in result_list:
                    f.write(str(item) + "\n")
            with open(prompt_file, "w", encoding="utf-8") as f:
                f.write("You are an expert in UI/UX design and iconography.\n")
                f.write("I will provide you with a list of visually matched tags.\n")
                f.write("For each icon, provide 3 to 5 *extra* synonyms, alternative names, or related UI concepts that a user might search for to find this icon.\n")
                f.write("IMPORTANT RULES:\n")
                f.write("1. Focus on what the icon *looks like* and its *UI function*.\n")
                f.write("2. Output ONLY a list of tags concatenated by commas. No markdown formatting, no explanations.\n")
                f.write("EXAMPLE:\n")
                f.write("settings -> gear, cog, preferences, options, components\n")
                f.write("favorite -> heart, like, love, save\n")
                f.write(f"ICON NAME: {base_name}\n")
                f.write("ICON TAGS:\n")
                for item in result_list:
                    f.write(str(item) + "\n")

main()