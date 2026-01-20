# ML Configuration Guide for Clinical Trials

This guide explains how to configure Machine Learning models for clinical trial predictions in the Kolate platform. The configuration process is designed to be user-friendly, even for non-technical users.

---

## Table of Contents

1. [Overview](#overview)
2. [Step 1: Upload & Register Models](#step-1-upload--register-models)
3. [Step 2: Define Input Fields](#step-2-define-input-fields)
4. [Step 3: Link Models & Configure Services](#step-3-link-models--configure-services)
5. [Step 4: Configure Charts & Analytics](#step-4-configure-charts--analytics)
6. [Step 5: Preview & Test](#step-5-preview--test)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The ML Configuration Wizard guides you through 5 steps to set up machine learning predictions for your clinical trial:

- **Models**: Upload or link your ML model files
- **Fields**: Define what data users will input for predictions
- **Linking**: Connect models to your study and configure processing
- **Charts**: Set up data visualizations (optional)
- **Preview**: Test your configuration before going live

---

## Step 1: Upload & Register Models

In this step, you upload or register the machine learning models that will make predictions for your clinical trial.

### Upload Methods

#### 📤 Upload File (Recommended for beginners)
Upload a model file directly from your computer.

**Supported Formats:**
- `.pkl` - Python pickle files (most common)
- `.pickle` - Alternative pickle extension
- `.joblib` - Joblib serialized files

**How to use:**
1. Drag and drop your model file into the upload area
2. Or click to browse and select your file
3. File size and name will be displayed once selected

#### ☁️ S3 Reference (For cloud storage)
Link to a model stored in Amazon S3.

**Format:** `s3://bucket-name/path/to/model.pkl`

**Example:** `s3://ml-models/trials/lung-cancer/response-model.pkl`

**When to use:**
- Your model is already stored in AWS S3
- You want centralized model management
- You're working with a team that shares models

#### 🌐 HTTP URL (For web-accessible models)
Provide a direct download URL to your model.

**Format:** `https://example.com/path/to/model.pkl`

**Example:** `https://models.hospital.org/trials/cart-therapy/model-v1.pkl`

**When to use:**
- Model is hosted on a web server
- You want to share models across organizations
- Model is in a public repository

---

### Model Configuration Fields

#### 🔑 **Model Key** (Required)
A unique identifier for your model used internally.

**Format:** Lowercase letters, numbers, and underscores only

**Examples:**
- `obj_response` - Objective response model
- `survival_rate` - Survival rate predictor
- `toxicity_risk` - Toxicity risk assessment

**Tips:**
- Keep it short and descriptive
- Use underscores instead of spaces
- Avoid special characters

---

#### 🏷️ **Display Name** (Required)
The human-readable name shown to users.

**Examples:**
- "Objective Response Predictor"
- "12-Month Survival Rate"
- "Toxicity Risk Assessment"

**Tips:**
- Use clear, professional language
- Include what the model predicts
- Keep it under 50 characters

---

#### 📊 **Model Type** (Required)
The type of prediction your model makes.

##### Classification
**What it is:** Predicts categories or classes (e.g., Yes/No, Low/Medium/High)

**Use when:**
- Predicting response types (Complete Response, Partial Response, No Response)
- Risk categories (Low, Medium, High)
- Binary outcomes (Success/Failure, Respond/Not Respond)

**Example outputs:**
- Complete Response
- High Risk
- Positive

##### Regression
**What it is:** Predicts continuous numerical values

**Use when:**
- Predicting survival time (e.g., 24.5 months)
- Risk scores (e.g., 0.75 on a 0-1 scale)
- Biomarker levels (e.g., 150.3 units)

**Example outputs:**
- 18.5 months
- 0.82 probability
- 145.7 mg/dL

---

#### 🛠️ **Model Framework**
The machine learning library used to create your model.

**Options:**

- **scikit-learn** (Default, most common)
  - Best for: General ML models, random forests, logistic regression
  - Most widely used in medical research

- **XGBoost**
  - Best for: High-performance gradient boosting
  - Popular for tabular clinical data

- **LightGBM**
  - Best for: Fast gradient boosting, large datasets
  - Efficient memory usage

- **TensorFlow**
  - Best for: Deep learning, neural networks
  - Complex pattern recognition

- **PyTorch**
  - Best for: Deep learning, research models
  - Flexible neural networks

**Tip:** If you're unsure, ask your data science team which framework was used to train the model.

---

#### 🔢 **Version**
Model version for tracking and updates.

**Format:** Semantic versioning (MAJOR.MINOR.PATCH)

**Examples:**
- `1.0.0` - Initial release
- `1.1.0` - Added new features
- `2.0.0` - Major changes

**Tips:**
- Increment when you update the model
- Helps track which model version is deployed
- Document changes in your team's records

---

#### 🎯 **Confidence Strategy**
How the model calculates confidence/certainty in its predictions.

**Options:**

##### Classification Probability (Default)
**What it is:** Uses the predicted probability for each class

**Best for:**
- Standard classification models
- Logistic regression
- Simple random forests

**How it works:** If a model predicts "Complete Response" with 85% probability, the confidence is 85%

**Choose this if:** You're using a basic classification model

---

##### XGBoost Ensemble Variance
**What it is:** Measures variation across decision trees in XGBoost ensemble

**Best for:**
- XGBoost models
- Gradient boosting models
- When you need uncertainty estimates

**How it works:** Looks at how much individual trees disagree - less disagreement = higher confidence

**Choose this if:**
- Your model is XGBoost
- You want to understand prediction uncertainty
- Your data scientist recommends it

---

##### Random Forest Variance
**What it is:** Measures variation across trees in a Random Forest

**Best for:**
- Random Forest models
- Ensemble methods
- Bootstrap aggregation models

**How it works:** Calculates variance of predictions across all trees in the forest

**Choose this if:**
- Your model is a Random Forest
- You want tree-level confidence
- You need ensemble uncertainty

---

#### 📈 **Sample Fraction**
Percentage of trees/estimators to sample when calculating variance-based confidence.

**Format:** Number between 0 and 1

**Examples:**
- `0.2` - Use 20% of trees (faster, less accurate)
- `0.5` - Use 50% of trees (balanced)
- `1.0` - Use all trees (slower, most accurate)

**When it matters:**
- Only used with variance-based strategies (XGBoost/Random Forest)
- Ignored for classification probability

**Recommendations:**
- Start with `0.2` for quick results
- Use `0.5` for production
- Use `1.0` for maximum accuracy

**Note:** Lower values are faster but may be less reliable.

---

#### 🏷️ **Response Mapping** (Classification only)
Maps model output values to human-readable labels.

**What it is:** Translates numerical predictions into meaningful text

**Example:**
```
Model Output → User-Friendly Label
0           → Complete Response
1           → Partial Response
2           → No Response
```

**How to configure:**
1. Enter the value your model outputs (e.g., `0`, `1`, `CR`, `PR`)
2. Enter the label users should see (e.g., "Complete Response")
3. Click "Add Mapping" for additional values

**Tips:**
- Map ALL possible output values
- Use clear, medical terminology
- Keep labels consistent across studies
- Common medical terms:
  - CR (Complete Response)
  - PR (Partial Response)
  - SD (Stable Disease)
  - PD (Progressive Disease)

**Example for binary model:**
```
0 → No Response
1 → Complete Response
```

**Example for multi-class model:**
```
0  → Complete Response (CR)
1  → Partial Response (PR)
2  → Stable Disease (SD)
3  → Progressive Disease (PD)
```

---

## Step 2: Define Input Fields

In this step, you define what information users will enter to get predictions.

### Field Configuration

#### 📝 **Field Name** (Required)
The name of the data field exactly as it appears in your model's training data.

**IMPORTANT:** Must match your model's expected input features EXACTLY

**Examples:**
- `Age` - Patient age
- `ECOG_Score` - Performance status
- `LDH_Level` - Lab value
- `Prior_Therapies` - Treatment history

**Tips:**
- Use same capitalization as training data
- Match underscores/spaces exactly
- Check with your data science team if unsure

---

#### 📋 **Description** (Required)
A clear explanation of what this field represents.

**Good examples:**
- "Patient age at diagnosis in years"
- "ECOG performance status score (0-5)"
- "LDH level at baseline (IU/L)"
- "Number of prior lines of therapy"

**Bad examples:**
- "Age" (too vague)
- "Score" (what kind?)
- "Level" (level of what?)

**Tips:**
- Include units (years, mg/dL, etc.)
- Mention range if applicable
- Explain medical abbreviations

---

#### 🔤 **Type** (Required)
The data type for this field.

##### Number
**Use for:**
- Age, weight, height
- Lab values (WBC, hemoglobin, etc.)
- Counts (tumor count, prior therapies)
- Scores (ECOG, KPS, etc.)

**Examples:**
- Patient age: `65`
- LDH level: `245.5`
- Prior therapies: `3`

##### String
**Use for:**
- Free text fields
- Comments or notes
- Identifiers
- Mixed alphanumeric data

**Examples:**
- Patient ID: `"PT-12345"`
- Notes: `"Patient reported fatigue"`

##### Categorical
**Use for:**
- Fixed set of options
- Classifications
- Yes/No questions
- Multiple choice

**Examples:**
- Gender: `Male`, `Female`, `Other`
- Stage: `I`, `II`, `III`, `IV`
- Response: `Yes`, `No`

---

#### 📊 **Category**
Statistical classification of the field.

##### Continuous
**What it is:** Values that can take any number within a range

**Use for:**
- Age (can be 65, 65.5, 65.25, etc.)
- Lab values (can be any decimal)
- Measurements (height, weight)
- Time periods

**Examples:**
- Age: 18-120
- BMI: 15.0-50.0
- Survival: 0-100 months

##### Categorical
**What it is:** Fixed, distinct categories

**Use for:**
- Gender (Male/Female/Other)
- Stage (I/II/III/IV)
- Yes/No questions
- Risk groups (Low/Medium/High)

**Examples:**
- Blood Type: A, B, AB, O
- Stage: Early, Advanced
- Response: CR, PR, SD, PD

---

### Field Validation

#### ✅ **Required**
Whether users must fill in this field.

**Enable when:**
- Field is critical for prediction
- Model cannot work without it
- Data is always available

**Disable when:**
- Field is optional
- Data might be missing
- Has a default value

**Tip:** Mark only truly essential fields as required.

---

#### 📏 **Min/Max Value** (Numbers only)
Acceptable range for numerical inputs.

**Examples:**

**Age:**
- Min: `0`
- Max: `120`

**ECOG Score:**
- Min: `0`
- Max: `5`

**LDH Level:**
- Min: `50`
- Max: `2000`

**Tips:**
- Set realistic medical ranges
- Consider outliers
- Align with training data ranges

---

#### 📋 **Allowed Values** (Categorical only)
The exact options users can select.

**Format:** Comma-separated list

**Examples:**

**Gender:**
```
Male, Female, Other
```

**Cancer Stage:**
```
I, II, III, IV
```

**ECOG Performance Status:**
```
0, 1, 2, 3, 4, 5
```

**Response Type:**
```
Complete Response, Partial Response, Stable Disease, Progressive Disease
```

**Tips:**
- Match model training data exactly
- Use consistent terminology
- Include all possible values
- Order logically (numerical, alphabetical, or by severity)

---

### Field Organization

#### 📁 **Group**
Groups related fields together in the UI.

**Common groups:**
- `Demographics` - Age, gender, ethnicity
- `Clinical` - Diagnosis, stage, performance status
- `Laboratory` - Blood tests, biomarkers
- `Treatment History` - Prior therapies, response
- `Vital Signs` - Blood pressure, heart rate

**Benefits:**
- Easier for users to fill out
- Logical organization
- Better user experience

---

#### 🔢 **Display Order**
The order this field appears in the form.

**Examples:**
- `1` - First field (usually patient ID or basic info)
- `2` - Second field
- `10` - Tenth field

**Tips:**
- Start with basic demographics
- Group related fields together
- End with optional fields
- Use gaps (1, 10, 20) for easy reordering later

---

### Quick Import from CSV

**What it does:** Automatically creates fields from your CSV column headers

**How to use:**
1. Click "Import from CSV"
2. Select a CSV file with your data
3. System reads the first row (headers)
4. Creates one field for each column

**After import:**
- Review each field
- Update types (number vs categorical)
- Add descriptions
- Set validation rules
- Organize into groups

**Tip:** This is fastest for large datasets, but you'll need to refine the fields afterward.

---

## Step 3: Link Models & Configure Services

### Model Linking

#### 🔗 **Link Models**
Connect the models you uploaded to this specific study.

**What it means:** A model can be uploaded once but used in multiple studies

**How to use:**
1. Select a model from the dropdown
2. Click "Link Model"
3. Model appears in the linked models list

**Primary Model:**
- The main model shown by default
- Users see this model's predictions first
- Click the star icon to set as primary
- You must have exactly one primary model

**Display Order:**
- Controls the order models appear to users
- Drag to reorder (grab icon on left)
- Lower numbers appear first

---

### Preprocessing Configuration

Settings for how input data is processed before predictions.

#### 🎯 **Requires One-Hot Encoding**
Converts categorical variables into binary columns.

**What it does:**
```
Before: Gender = "Male"
After:  Gender_Male = 1, Gender_Female = 0, Gender_Other = 0
```

**Enable when:**
- Your model was trained with one-hot encoded data
- You have categorical variables
- Using scikit-learn or similar frameworks

**Disable when:**
- Model handles categories directly (some tree-based models)
- All inputs are numerical
- Your data scientist says it's not needed

**Default:** Enabled (most models need this)

---

#### ❓ **Missing Value Strategy**
How to handle missing or incomplete data.

##### Zero Fill (Default)
**What it does:** Replaces missing values with `0`

**Best for:**
- Models trained with zeros for missing data
- When `0` is a valid value
- Simple, consistent approach

**Example:** Missing age → `0`

---

##### Mean
**What it does:** Replaces missing values with the average of that field

**Best for:**
- Continuous numerical data
- When you have training data statistics
- Normally distributed values

**Example:** Missing age → `65` (if average age is 65)

**Note:** System needs to know the mean value from training data

---

##### Median
**What it does:** Replaces missing values with the middle value

**Best for:**
- Data with outliers
- Skewed distributions
- More robust than mean

**Example:** Missing LDH → `250` (if median LDH is 250)

---

##### Mode
**What it does:** Replaces missing values with the most common value

**Best for:**
- Categorical data
- Binary fields
- When one value is very common

**Example:** Missing gender → `Male` (if Male is most common)

---

##### Drop Row
**What it does:** Skips prediction if any required field is missing

**Best for:**
- When accuracy is critical
- Models that can't handle missing data
- Research settings

**Warning:** User will see an error if data is incomplete

---

### Service Configuration

Performance and tracking settings.

#### ⏱️ **Cache TTL (seconds)**
How long to store prediction results in cache.

**What it is:** Time-to-Live - duration to keep results before recalculating

**Values:**
- `0` - No caching (always recalculate)
- `60` - 1 minute (for frequently changing data)
- `300` - 5 minutes (default, good balance)
- `3600` - 1 hour (for stable predictions)
- `86400` - 24 hours (for very stable data)

**Recommendations:**
- Development/testing: `60` seconds
- Production: `300` seconds (5 minutes)
- Static models: `3600` seconds (1 hour)

**Benefits of caching:**
- Faster response times
- Reduced server load
- Lower costs

**Disable caching (set to 0) when:**
- Testing new models
- Models update frequently
- Debugging issues

---

#### 📊 **Max Batch Rows**
Maximum number of patients to process in one batch prediction.

**What it is:** Limit for CSV batch uploads

**Values:**
- `100` - Small batches (safer, slower)
- `1000` - Default (good for most uses)
- `5000` - Large batches (faster, more memory)
- `10000` - Very large (requires good server)

**Recommendations:**
- Small datasets (<100 patients): `100`
- Medium datasets (100-1000): `1000`
- Large datasets (>1000): `5000`

**Considerations:**
- Higher = faster but more memory
- Lower = slower but more stable
- Consider your server capacity

---

#### 📝 **Enable Execution Tracking**
Save detailed logs of each prediction request.

**What it tracks:**
- Who made the prediction
- When it was made
- Input data used
- Results returned
- Model versions used

**Enable when:**
- You need an audit trail
- Researching model performance
- Regulatory compliance required
- Debugging issues

**Disable when:**
- Privacy concerns
- Storage constraints
- Simple testing

**Default:** Enabled (recommended for clinical settings)

**Benefits:**
- Audit compliance
- Performance monitoring
- Issue troubleshooting
- Research insights

---

## Step 4: Configure Charts & Analytics

Optional data visualizations for your study.

### Enable/Disable Charts

**When to enable:**
- You have historical patient data
- Want to show outcomes distribution
- Comparing model predictions vs actual results
- Presenting study progress to stakeholders

**When to disable:**
- New study with no data yet
- Privacy concerns
- Don't need visualizations
- Focus on predictions only

---

### Data Configuration

#### 🗄️ **MongoDB Collection** (Required if charts enabled)
The database collection where patient outcome data is stored.

**Format:** Collection name in MongoDB

**Examples:**
- `cart_therapy_patients`
- `lung_cancer_study_data`
- `trial_xyz_outcomes`

**Tips:**
- Check with your database administrator
- Must have read access
- Collection should contain outcome data

---

#### 📊 **Response Field**
The database field containing patient outcomes/responses.

**Examples:**
- `bestrespg` - Best response grade
- `outcome` - Final outcome
- `response_status` - Response classification

**Common values in field:**
- Complete Response (CR)
- Partial Response (PR)
- Stable Disease (SD)
- Progressive Disease (PD)

**Tip:** This field is used to calculate response rates and outcomes distribution.

---

### Chart Types

Configure different visualizations for your data.

#### 📊 **Chart Name**
Descriptive name for the chart.

**Examples:**
- "Age Distribution"
- "Gender-Based Response Rates"
- "ECOG Score Analysis"
- "LDH Level Outcomes"

---

#### 🏷️ **Data Field**
The database field to visualize.

**Examples:**
- `ptage` - Patient age
- `sex_id` - Gender
- `ldh_ipi` - LDH levels
- `ecog_score` - Performance status

**Tip:** Must exactly match field name in MongoDB collection.

---

#### 📈 **Chart Type**
Visual representation style.

##### Bar Chart (Default)
**Best for:**
- Comparing categories
- Response rates by group
- Count comparisons

**Example:** Response rates by gender (Male vs Female)

---

##### Horizontal Bar
**Best for:**
- Long category names
- Ranking data
- Multiple categories

**Example:** Response rates across different cancer stages

---

##### Stacked Bar
**Best for:**
- Showing composition
- Part-to-whole relationships
- Comparing subcategories

**Example:** CR vs PR vs SD breakdown by age group

---

##### Pie Chart
**Best for:**
- Overall proportions
- Simple category splits
- Percentage breakdowns

**Example:** Overall response distribution (60% CR, 30% PR, 10% NR)

---

##### Donut Chart
**Best for:**
- Modern-looking proportions
- Emphasizing total with segments
- Cleaner than pie charts

**Example:** Same as pie, with center space

---

##### Line Chart
**Best for:**
- Trends over time
- Sequential data
- Continuous monitoring

**Example:** Response rates over study timeline

---

##### Area Chart
**Best for:**
- Cumulative trends
- Volume over time
- Filled regions emphasis

**Example:** Patient enrollment over time

---

#### 📋 **Category Order**
The order categories appear in the chart.

**Format:** Comma-separated list

**Examples:**

**Age groups:**
```
<40, 40-50, 50-60, 60-70, >70
```

**Response severity:**
```
Complete Response, Partial Response, Stable Disease, Progressive Disease
```

**Lab levels:**
```
Normal, Borderline, Elevated, High
```

**Tips:**
- Order logically (low to high, best to worst)
- Matches medical conventions
- Improves readability

---

#### 📊 **Distribution Chart**
Shows frequency distribution of values.

**Enable for:**
- Age distributions
- Score distributions
- Numeric ranges

**Example:** How many patients in each age bracket

---

#### 🔧 **Custom Grouping**
Apply special grouping logic to data.

**Grouping Types:**

##### Age
Groups patient ages into brackets.

**Example:**
- `<40` - Under 40
- `40-60` - Middle age
- `>60` - Older patients

##### Range
Groups continuous values into ranges.

**Example:** LDH levels
- `Low (0-200)`
- `Normal (200-400)`
- `High (>400)`

**When to use:**
- Converting continuous data to categories
- Medical standard ranges
- Easier interpretation

---

## Step 5: Preview & Test

Final step to validate your configuration.

**What happens:**
1. System creates the ML configuration
2. Loads models into memory
3. Runs validation checks
4. Provides test interface

**Test prediction:**
- Fill in sample patient data
- Get prediction results
- Verify output formats
- Check confidence scores

**Before going live:**
- Test with known patient data
- Verify predictions match expectations
- Check all models work
- Confirm field validation works
- Review chart displays (if enabled)

---

## Best Practices

### Model Management
1. **Version everything** - Always use version numbers
2. **Test before deploying** - Validate predictions with known data
3. **Document changes** - Keep notes on model updates
4. **Backup models** - Store copies of model files
5. **Monitor performance** - Track prediction accuracy

### Field Configuration
1. **Match training data** - Field names must match exactly
2. **Validate ranges** - Set realistic min/max values
3. **Group logically** - Organize fields by category
4. **Write clear descriptions** - Help users understand each field
5. **Mark required carefully** - Only require truly essential fields

### Data Quality
1. **Handle missing data** - Choose appropriate strategy
2. **Validate inputs** - Set proper validation rules
3. **Test edge cases** - Try unusual values
4. **Document assumptions** - Note any data preprocessing

### Security & Compliance
1. **Enable tracking** - For audit trails
2. **Protect PHI** - Don't expose sensitive data in charts
3. **Control access** - Limit who can configure models
4. **Regular audits** - Review configurations periodically

---

## Troubleshooting

### Model won't load
**Possible causes:**
- Wrong file format
- Incompatible framework version
- Corrupted file
- S3 permissions issues

**Solutions:**
- Verify file format (.pkl, .pickle, .joblib)
- Check framework version matches
- Re-export model from source
- Verify S3 bucket permissions

---

### Predictions failing
**Possible causes:**
- Missing required fields
- Field names don't match
- Wrong data types
- Out of range values

**Solutions:**
- Check field names match training data exactly
- Verify all required fields provided
- Check data types (number vs string)
- Review min/max validation

---

### Charts not displaying
**Possible causes:**
- MongoDB collection doesn't exist
- No data in collection
- Wrong field names
- Permissions issues

**Solutions:**
- Verify collection name
- Check data exists
- Match field names to database
- Verify database access

---

### Low confidence scores
**Possible causes:**
- Input data very different from training
- Model uncertainty
- Conflicting features

**Solutions:**
- Review input data quality
- Check if patient fits model criteria
- Consider retraining model
- Use as intended - low confidence is valid information

---

## Getting Help

**For technical issues:**
- Contact your system administrator
- Check system logs
- Review error messages

**For model questions:**
- Consult your data science team
- Review model documentation
- Check training data specifications

**For clinical questions:**
- Consult study principal investigator
- Review study protocol
- Check with medical team

---

## Glossary

**Classification** - Predicting categories (e.g., Yes/No, High/Low)

**Regression** - Predicting numbers (e.g., survival time, probability)

**One-Hot Encoding** - Converting categories to binary columns

**Confidence** - How certain the model is about its prediction

**Cache** - Temporary storage for faster repeat access

**Batch Prediction** - Making predictions for multiple patients at once

**Field Metadata** - Information about input fields (type, validation, etc.)

**Model Framework** - The ML library used (scikit-learn, XGBoost, etc.)

**TTL** - Time To Live, how long cached data remains valid

**Preprocessing** - Data transformations before model prediction

---

**Document Version:** 1.0.0
**Last Updated:** 2024
**For:** Kolate AI Platform
