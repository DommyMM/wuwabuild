import cv2
import numpy as np
import pytesseract
from PIL import Image
import os
import re
import json
from pathlib import Path

SCAN_REGIONS = {
    "info": {"top": 0, "left": 0, "width": 0.13, "height": 0.11},
    "characterPage": {"top": 0.09, "left": 0.09, "width": 0.22, "height": 0.18},
    "weaponPage": {"top": 0.11, "left": 0.09, "width": 0.215, "height": 0.25},
    "echoPage": {"top": 0.12, "left": 0.73, "width": 0.23, "height": 0.34},
    "s1": {"top": 0.1047, "left": 0.647, "width": 0.0234, "height": 0.0454},
    "s2": {"top": 0.259, "left": 0.733, "width": 0.028, "height": 0.047},
    "s3": {"top": 0.473, "left": 0.765, "width": 0.0234, "height": 0.0454},
    "s4": {"top": 0.682, "left": 0.734, "width": 0.025, "height": 0.0454},
    "s5": {"top": 0.8364, "left": 0.645, "width": 0.029, "height": 0.046},
    "s6": {"top": 0.895, "left": 0.527, "width": 0.025, "height": 0.047},
    "normal-base": {"top": 0.88, "left": 0.2, "width": 0.074, "height": 0.1},
    "normal-mid": {"top": 0.568, "left": 0.22, "width": 0.038, "height": 0.067},
    "normal-top": {"top": 0.36, "left": 0.22, "width": 0.038, "height": 0.067},
    "skill-base": {"top": 0.75, "left": 0.323, "width": 0.074, "height": 0.1},
    "skill-mid": {"top": 0.438, "left": 0.343, "width": 0.038, "height": 0.067},
    "skill-top": {"top": 0.23, "left": 0.343, "width": 0.038, "height": 0.067},
    "circuit-base": {"top": 0.683, "left": 0.463, "width": 0.074, "height": 0.1},
    "circuit-mid": {"top": 0.37, "left": 0.477, "width": 0.05, "height": 0.09},
    "circuit-top": {"top": 0.16, "left": 0.477, "width": 0.05, "height": 0.09},
    "liberation-base": {"top": 0.754, "left": 0.6067, "width": 0.074, "height": 0.1},
    "liberation-mid": {"top": 0.438, "left": 0.6267, "width": 0.038, "height": 0.067},
    "liberation-top": {"top": 0.23, "left": 0.6267, "width": 0.038, "height": 0.067},
    "intro-base": {"top": 0.88, "left": 0.727, "width": 0.074, "height": 0.07},
    "intro-mid": {"top": 0.568, "left": 0.747, "width": 0.038, "height": 0.067},
    "intro-top": {"top": 0.36, "left": 0.747, "width": 0.038, "height": 0.067}
}

BACKEND_DIR = Path(__file__).parent
ROOT_DIR = BACKEND_DIR.parent
DATA_DIR = ROOT_DIR / 'Data'
DOWNLOADS_DIR = ROOT_DIR.parent 
DEBUG_DIR = DOWNLOADS_DIR / 'wuwa_debug'

try:
    with open(DATA_DIR / 'Characters.json', 'r', encoding='utf-8') as f:
        CHARACTERS = json.load(f)
    with open(DATA_DIR / 'Weapons.json', 'r', encoding='utf-8') as f:
        WEAPONS = json.load(f)
except FileNotFoundError:
    print("Warning: Reference data files not found")
    CHARACTERS = []
    WEAPONS = {}
except json.JSONDecodeError as e:
    print(f"Warning: Invalid JSON format in data files: {e}")
    CHARACTERS = []
    WEAPONS = {}

def preprocess_image(image, region_name=None):
    DEBUG_DIR.mkdir(exist_ok=True)
    
    if region_name:
        debug_original = DEBUG_DIR / f'{region_name}_original.jpg'
        cv2.imwrite(str(debug_original), image)
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)
    thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    
    if region_name:
        debug_processed = DEBUG_DIR / f'{region_name}_processed.jpg'
        cv2.imwrite(str(debug_processed), thresh)
    
    return thresh

def crop_region(image, region):
    height, width = image.shape[:2]
    x = int(width * region["left"])
    y = int(height * region["top"])
    w = int(width * region["width"])
    h = int(height * region["height"])
    return image[y:y+h, x:x+w]

def clean_text(text):
    return ' '.join(word for word in text.lower().split() 
                   if len(word) > 2)

def process_image(image):
    if image is None or image.size == 0:
        raise ValueError("Invalid image input")
    
    try:
        DEBUG_DIR.mkdir(exist_ok=True)
        cv2.imwrite(str(DEBUG_DIR / 'full_original.jpg'), image)

        info_coords = SCAN_REGIONS["info"]
        region_img = crop_region(image, info_coords)
        if region_img.size == 0:
            raise ValueError("Failed to crop info region")

        processed = preprocess_image(region_img, "info")
        info_text = pytesseract.image_to_string(processed)
        
        print("\n=== OCR Debug ===")
        print("Info Region Raw Text:")
        print(info_text)
        
        image_type = determine_type(info_text.lower())
        print(f"\nDetermined Type: {image_type}")

        region_key = {
            'Character': 'characterPage',
            'Weapon': 'weaponPage',
            'Echo': 'echoPage',
            'Sequences': ['s1', 's2', 's3', 's4', 's5', 's6'],
            'Forte': ['normal-base', 'normal-mid', 'normal-top', 
                      'skill-base', 'skill-mid', 'skill-top', 
                      'circuit-base', 'circuit-mid', 'circuit-top',
                      'liberation-base', 'liberation-mid', 'liberation-top',
                      'intro-base', 'intro-mid', 'intro-top']
        }.get(image_type)

        details = {}
        if region_key:            
            if image_type == 'Sequences':
                slots = []
                for slot_key in region_key:
                    slot_coords = SCAN_REGIONS[slot_key]
                    slot_img = crop_region(image, slot_coords)
                    cv2.imwrite(str(DEBUG_DIR / f'{slot_key}_original.jpg'), slot_img)
                    slots.append(slot_img)
                details = get_sequence_info(slots)
            elif image_type == 'Forte':
                slots = {}
                for region_name in region_key:
                    slot_coords = SCAN_REGIONS[region_name]
                    slot_img = crop_region(image, slot_coords)
                    cv2.imwrite(str(DEBUG_DIR / f'{region_name}_original.jpg'), slot_img)
                    slots[region_name] = slot_img
                details = get_forte_info(slots)
            else:
                region_coords = SCAN_REGIONS[region_key]
                detail_img = crop_region(image, region_coords)
                processed_detail = preprocess_image(detail_img, region_key)
                detail_text = pytesseract.image_to_string(processed_detail)
                print("\nRegion Raw Text:")
                print(detail_text)
                print("================")
                details = extract_details(processed_detail, image_type)
            

        print("\n=== Final Response ===")
        response = {
            "success": True,
            "analysis": {
                "type": image_type,
                **details
            }
        }
        print(json.dumps(response, indent=2))
        print("===================")
        return response

    except Exception as e:
        print("\n=== Error Response ===")
        response = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(response, indent=2))
        print("===================")
        return response

def determine_type(text):
    cost_patterns = ['cost', 'ost', '€ost', 'cst']
    has_cost = any(pattern in text for pattern in cost_patterns)
    has_cost_number = '/12' in text
    has_all_or_at = any(word in ['all', 'at'] for word in text.split())
    
    if sum([has_cost, has_cost_number, has_all_or_at]) >= 2:
        return 'Echo'
        
    type_mappings = {
        'overview': 'Character',
        'weapon': 'Weapon',
        'forte': 'Forte',
        'resonance': 'Sequences'
    }
    
    for key, value in type_mappings.items():
        if key in text:
            return value
            
    return "unknown"

def get_character_info(text):
    """Extract character name and level from OCR text"""
    text = text.replace(':', '').replace('.',' ').replace('  ', ' ')
    
    level_patterns = [
        r'Lv[\.|\s]*(\d+)[\s/]+(\d+)', 
        r'v[\.]?(\d+)[\s/]+(\d+)',
        r'Level[\s]*(\d+)[\s/]+(\d+)'
    ]
    
    level = None
    for pattern in level_patterns:
        match = re.search(pattern, text)
        if match:
            level = match.groups()
            break
    
    name = None
    for character in CHARACTERS:
        if character['name'].lower() in text.lower():
            name = character['name']
            break
            
    return {
        'name': name,
        'level': level[0] if level else None
    }

def get_weapon_info(text):
    """Extract weapon info from OCR text"""
    lines = text.split('\n')
    if not lines:
        return {'name': None, 'weaponType': None, 'level': None, 'rank': None}
        
    first_line = lines[0].strip()\
                        .replace('©', '')\
                        .replace('\\', '')\
                        .replace('%', '')\
                        .replace(':', '')\
                        .replace('  ', ' ')\
                        .replace('q', 'g')\
                        .strip()
    
    name = None
    weapon_type = None
    for type_name, weapons in WEAPONS.items():
        for weapon in weapons:
            if weapon.lower() in first_line.lower():
                name = weapon
                weapon_type = type_name
                break
        if name:
            break
            
    text = text.replace(':', '').replace('.',' ').replace('  ', ' ')
    text_lower = text.lower()
    
    level_patterns = [
        r'Lv[\.|\s]*(\d+)[\s/]+(\d+)',
        r'v[\.]?(\d+)[\s/]+(\d+)',
        r'Level[\s]*(\d+)[\s/]+(\d+)'
    ]
    
    level = None
    for pattern in level_patterns:
        match = re.search(pattern, text)
        if match:
            level = match.groups()
            break
            
    rank_match = re.search(r'rank\s*(\d+)', text_lower)
    rank = rank_match.group(1) if rank_match else None
    
    return {
        'type': 'Weapon', 
        'name': name,
        'weaponType': weapon_type,
        'level': level[0] if level else None,
        'rank': rank
    }

def get_sequence_info(slots):
    sequence_states = []
    yellow_lower = np.array([45, 100, 150])
    yellow_upper = np.array([65, 255, 255])
    
    for i, slot_img in enumerate(slots):
        hsv = cv2.cvtColor(slot_img, cv2.COLOR_BGR2HSV)
        
        if i == 5:
            yellow_lower_s6 = np.array([30, 50, 100])
            yellow_upper_s6 = np.array([75, 255, 255])
            blue_lower = np.array([100, 30, 30])
            blue_upper = np.array([130, 255, 255])
            
            yellow_mask = cv2.inRange(hsv, yellow_lower_s6, yellow_upper_s6)
            blue_mask = cv2.inRange(hsv, blue_lower, blue_upper)
            
            yellow_ratio = (np.count_nonzero(yellow_mask) / (slot_img.shape[0] * slot_img.shape[1])) * 100
            blue_ratio = (np.count_nonzero(blue_mask) / (slot_img.shape[0] * slot_img.shape[1])) * 100
            
            print(f"Slot 6 yellow ratio: {yellow_ratio}%, blue ratio: {blue_ratio}%")
            sequence_states.append(1 if yellow_ratio > blue_ratio else 0)
        else:
            yellow_mask = cv2.inRange(hsv, yellow_lower, yellow_upper)
            yellow_ratio = (np.count_nonzero(yellow_mask) / (slot_img.shape[0] * slot_img.shape[1])) * 100
            print(f"Slot {i+1} yellow ratio: {yellow_ratio}%")
            sequence_states.append(1 if yellow_ratio > 0.1 else 0)
    
    count = 0
    for state in sequence_states:
        if state == 1:
            count += 1
        else:
            break
    
    return {
        'type': 'Sequences',
        'sequence': count
    }

def get_forte_info(slots):
    branches = {
        'normalAttack': {'level': 1, 'middleNode': False, 'topNode': False},
        'skill': {'level': 1, 'middleNode': False, 'topNode': False},
        'circuit': {'level': 1, 'middleNode': False, 'topNode': False},
        'liberation': {'level': 1, 'middleNode': False, 'topNode': False},
        'introSkill': {'level': 1, 'middleNode': False, 'topNode': False}
    }

    slot_to_branch = {
        'normal-base': 'normalAttack',
        'skill-base': 'skill',
        'circuit-base': 'circuit', 
        'liberation-base': 'liberation',
        'intro-base': 'introSkill'
    }

    level_patterns = [
        r'(\d+)/[\s]*(?:10|110)',
        r'Lv[:\.]\s*(\d+)/',
        r'v[:\.]\s*(\d+)/',
        r'Lv[:\.]\s*(\d+)',
        r'v[:\.]\s*(\d+)',
    ]

    for slot_name, image in slots.items():
        branch_name = None
        
        if 'base' in slot_name:
            branch_name = slot_to_branch.get(slot_name)
            if branch_name:
                text = pytesseract.image_to_string(image)
                text = text.replace('\\', '').replace('"', '').replace("'", '')
                
                level = None
                for pattern in level_patterns:
                    match = re.search(pattern, text)
                    if match:
                        try:
                            level = int(match.group(1))
                            if 1 <= level <= 10:
                                branches[branch_name]['level'] = level
                                break
                        except ValueError:
                            continue
                            
        elif 'mid' in slot_name or 'top' in slot_name:
            branch_base = slot_name.split('-')[0]
            branch_name = slot_to_branch.get(f'{branch_base}-base')
            
            if branch_name:
                is_active = is_node_active(image, slot_name)
                
                if 'mid' in slot_name:
                    branches[branch_name]['middleNode'] = is_active
                else:
                    branches[branch_name]['topNode'] = is_active

    result = {
        'type': 'Forte',
        **{
            name: [
                branches[branch]['level'],
                1 if branches[branch]['middleNode'] else 0,
                1 if branches[branch]['topNode'] else 0
            ] for name, branch in {
                'normal': 'normalAttack',
                'skill': 'skill', 
                'circuit': 'circuit',
                'liberation': 'liberation',
                'intro': 'introSkill'
            }.items()
        }
    }

    return result

def is_node_active(image, slot_name="unknown"):
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    if 'circuit' in slot_name:
        white_lower = np.array([0, 0, 180])
        white_upper = np.array([180, 30, 255])
        blue_lower = np.array([100, 30, 30])
        blue_upper = np.array([130, 255, 255])
        
        white_mask = cv2.inRange(hsv, white_lower, white_upper)
        blue_mask = cv2.inRange(hsv, blue_lower, blue_upper)
        
        white_ratio = (np.count_nonzero(white_mask) / (image.shape[0] * image.shape[1])) * 100
        blue_ratio = (np.count_nonzero(blue_mask) / (image.shape[0] * image.shape[1])) * 100
        
        return white_ratio > 20 and white_ratio < 35 and blue_ratio < 60
    else:
        on_color_rgb = [243, 243, 244]
        on_color_hsv = cv2.cvtColor(np.uint8([[on_color_rgb]]), cv2.COLOR_RGB2HSV)[0][0]
        lower_white = np.array([on_color_hsv[0] - 10, 0, 200])
        upper_white = np.array([on_color_hsv[0] + 10, 30, 255])
        
        white_mask = cv2.inRange(hsv, lower_white, upper_white)
        white_ratio = (np.count_nonzero(white_mask) / (image.shape[0] * image.shape[1])) * 100
        
        return white_ratio > 15

def extract_details(image, image_type):
    """Extract details based on image type"""
    text = pytesseract.image_to_string(image)
    
    if image_type == 'Character':
        return get_character_info(text)
    elif image_type == 'Weapon':
        return get_weapon_info(text)
    elif image_type == 'Sequences':
        return get_sequence_info(image)
    elif image_type == 'Forte':
        return get_forte_info(image)
    else:
        return {'raw_text': clean_text(text)}