/**
 * STUDENT PROFILE TABS - Quick Integration Guide
 * 
 * File: frontend/src/pages/StudentProfile.tsx
 * 
 * STEP 1: Locate line ~180 (after the header section)
 * Look for: </div> that closes the header with student name and badges
 * 
 * STEP 2: Add the Tabs wrapper
 */

// BEFORE (around line 180):
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information Card */}
          <Card className="lg:col-span-1">
          // ... rest of content

// AFTER:
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Fee History
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ID & Security
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* KEEP: All existing Personal Information and Enrollment cards */}
            </div>
          </TabsContent>

          {/* Fee History Tab */}
          <TabsContent value="fees">
            {/* MOVE: The existing Fee History Card here */}
          </TabsContent>

          {/* ID & Security Tab - NEW */}
          <TabsContent value="security">
            <DigitalIDCard student={student} />
          </TabsContent>
        </Tabs>

/**
 * STEP 3: Move the Fee History Card
 * 
 * Find the Card with "Fee History (Ledger)" title (around line 370)
 * Cut it from its current location
 * Paste it inside <TabsContent value="fees">
 */

/**
 * STEP 4: Close the Tabs
 * 
 * At the very end, before </DashboardLayout>, add:
 * </Tabs>
 */

/**
 * FINAL STRUCTURE:
 * 
 * <DashboardLayout>
 *   <div className="space-y-6">
 *     {/* Header with student name and badges */}
 *     
 *     <Tabs defaultValue="overview">
 *       <TabsList>...</TabsList>
 *       
 *       <TabsContent value="overview">
 *         {/* Personal Info + Enrollment */}
 *       </TabsContent>
 *       
 *       <TabsContent value="fees">
 *         {/* Fee History Table */}
 *       </TabsContent>
 *       
 *       <TabsContent value="security">
 *         <DigitalIDCard student={student} />
 *       </TabsContent>
 *     </Tabs>
 *   </div>
 * </DashboardLayout>
 */
